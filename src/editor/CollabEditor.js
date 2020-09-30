import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, { useContext, useEffect, useRef, useState } from "react";

import Delta from "quill-delta";
import ReactQuill from "react-quill";
import UserAuthContext from "../auth/UserAuthContext.js";
import { initialDelta } from "./delta.js";
import { v4 as uuidv4 } from "uuid";

// Synchronize every second by default (1000ms).
const defaultSyncPeriod = 1000;

// CollabEditor is a React component that allows multiple users to edit
// and highlight a text document simultaneously.
//
// The core functionality is to iteratively apply text edits from multiple
// sources such that all viewers see the same result.
//
// We rely primarily on the server-generated timestamp to reconcile
// the order in which edits are applied.
//
// It uses the Quill editor (see https://quilljs.com).
//
// The Quill editor uses a handy content format called Delta, which represents
// operations like text insertion, deletion, formatting, etc. in a manner
// similar to `diff(1)`.
//
// On page load, this component loads the latest cached revision (an
// insert-only quill delta object, as JSON) from the database.
//
// This component subscibes to the latest revision, restarting its subscription
// to the deltas collection to fetch only those changes that came after.
//
// When this component receives an update to the deltas collection, it
// reconciles the new data with the content of the quill editor as follows:
//
// 1) Let A: Unapply the local delta buffer from editor
// 2) Let B: Compute the delta document that includes revision and every
//    committed delta, and the filtered uncommitted deltas
// 3) Let diff: Compute the diff between A and B
// 4) Transform the local delta buffer by diff
// 5) Apply the diff to the editor.
// 6) Re-apply the transformed local delta buffer to editor
//
export default function CollabEditor({
  quillRef,
  deltasRef,
  revisionsRef,
  onLoad,
  onChange,
  syncPeriod,
  ...otherProps
}) {
  const [editorID] = useState(uuidv4());
  const [revisionDelta, setRevisionDelta] = useState();
  const [revisionTimestamp, setRevisionTimestamp] = useState();

  const uncommittedDeltas = useRef([]);

  const { oauthClaims } = useContext(UserAuthContext);

  const localDelta = useRef(new Delta([]));

  const deltaSyncPeriod = syncPeriod || defaultSyncPeriod;

  // Subscribe to the latest revision
  useEffect(() => {
    if (!revisionsRef) {
      return;
    }

    return revisionsRef
      .orderBy("timestamp", "desc")
      .limit(1)
      .onSnapshot((snapshot) => {
        if (snapshot.size === 0) {
          setRevisionDelta(initialDelta());
          setRevisionTimestamp(new firebaseClient.firestore.Timestamp(0, 0));
          return;
        }

        let revision = snapshot.docs[0].data();
        setRevisionDelta(new Delta(revision.delta.ops));
        if (!revision.timestamp) {
          setRevisionTimestamp(new firebaseClient.firestore.Timestamp(0, 0));
          return;
        }

        setRevisionTimestamp(revision.timestamp);
      });
  }, [revisionsRef]);

  // Document will contain the latest cached and compressed version of the
  // delta document. Subscribe to deltas from other remote clients.
  useEffect(() => {
    if (!editorID || !deltasRef || !revisionDelta || !revisionTimestamp) {
      return;
    }

    if (!quillRef || !quillRef.current) {
      return;
    }
    let editor = quillRef.current.getEditor();

    console.debug(
      "Subscribing to remote deltas since",
      revisionTimestamp.toDate()
    );

    return deltasRef
      .orderBy("timestamp", "asc")
      .where("timestamp", ">", revisionTimestamp)
      .onSnapshot((snapshot) => {
        // filter out newly committed deltas from uncommittedDeltas
        let newUncommittedDeltas = uncommittedDeltas.current;
        snapshot.docs.forEach((deltaDoc) => {
          newUncommittedDeltas = newUncommittedDeltas.filter(
            (d) => d.ID !== deltaDoc.id
          );
        });
        uncommittedDeltas.current = newUncommittedDeltas;

        let committedDeltas = [];
        snapshot.forEach((deltaDoc) => {
          committedDeltas.push(new Delta(deltaDoc.data().ops));
        });

        let editorContents = editor.getContents();

        console.debug("localDelta.current", localDelta.current);
        let inverseLocalDelta = localDelta.current.invert(editorContents);
        console.debug("inverseLocalDelta", inverseLocalDelta);

        // Compute local: latest revision + old committed deltas +
        //                old uncommitted deltas
        //                == editor content - local delta
        let local = editorContents.compose(inverseLocalDelta);
        console.debug("local", local);

        // Compute remote: latest revision + new committed deltas +
        //                 new uncommitted deltas
        let remote = revisionDelta;
        committedDeltas.forEach((delta) => {
          remote = remote.compose(delta);
        });
        newUncommittedDeltas.forEach((delta) => {
          remote = remote.compose(delta);
        });
        console.debug("remote", remote);

        // Compute update patch from local to remote
        let diff = local.diff(remote);
        console.debug("diff", diff);

        if (diff.ops.length === 0) {
          console.debug("diff is empty; nothing to do");
          return;
        }

        // Unapply the local delta from the editor
        let selection = editor.getSelection();
        let selectionIndex = selection ? selection.index : 0;

        selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);
        console.debug("unapplying local delta", inverseLocalDelta);
        editor.updateContents(inverseLocalDelta);

        // Apply the update patch to the editor
        console.debug("applying remote update patch", diff);
        selectionIndex = diff.transformPosition(selectionIndex);
        editor.updateContents(diff);

        // Re-apply the transformed local delta to the editor

        // Transform the local delta buffer by diff
        console.debug("pre-transformed local delta", localDelta.current);
        localDelta.current = new Delta(diff.transform(localDelta.current).ops);
        console.debug("transformed local delta", localDelta.current);
        selectionIndex = localDelta.current.transformPosition(selectionIndex);
        console.debug("re-applying transformed local delta");
        editor.updateContents(localDelta.current);

        if (selection) {
          console.debug("updating selection index");
          editor.setSelection(selectionIndex, selection.length);
        }
      });
  }, [editorID, revisionDelta, revisionTimestamp, deltasRef, quillRef]);

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    if (!deltasRef) {
      return;
    }

    // This function sends the contents of `localDelta` to the database
    // and resets the local cache.
    const syncDeltas = () => {
      let opsIndex = localDelta.current.ops.length;
      if (opsIndex === 0) {
        return;
      }

      let ops = localDelta.current.ops.slice(0, opsIndex);
      localDelta.current = new Delta(localDelta.current.ops.slice(opsIndex));

      let deltaID = uuidv4();

      let deltaDoc = {
        ID: deltaID,
        editorID: editorID,
        userEmail: oauthClaims.email,
        timestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
        ops: ops,
      };

      console.debug("uploading delta", deltaDoc);
      uncommittedDeltas.current.push(deltaDoc);
      deltasRef.doc(deltaID).set(deltaDoc);
    };

    console.debug(`starting periodic syncDeltas every ${deltaSyncPeriod}ms`);
    let syncDeltaInterval = setInterval(syncDeltas, deltaSyncPeriod);

    return () => {
      console.debug("stopping delta sync");
      clearInterval(syncDeltaInterval);
    };
  }, [deltasRef, editorID, oauthClaims.email, deltaSyncPeriod]);

  // onEdit builds a batch of local edits in `localDelta`
  // which are sent to the server and reset to [] periodically
  // in `syncDeltas()`.
  const onEdit = (content, delta, source, editor) => {
    if (source !== "user") {
      console.debug("onChange: skipping non-user change", delta, source);
      return;
    }

    localDelta.current = localDelta.current.compose(delta);

    if (onChange) {
      onChange(content, delta, source, editor);
    }
  };

  if (!revisionDelta) return <></>;

  return (
    <ReactQuill
      ref={quillRef}
      onChange={onEdit}
      defaultValue={revisionDelta}
      {...otherProps}
    />
  );
}
