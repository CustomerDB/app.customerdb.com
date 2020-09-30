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
// It uses the Quill editor (see https://quilljs.com).
//
// The Quill editor uses a handy content format called Delta, which represents
// operations like text insertion, deletion, formatting, etc. in a manner
// similar to `diff(1)`.
//
// This component manages the bidirectional synchronization necessary to
// construct the illusion of simultaneous editing by distributed clients.
//
// On page load, this component loads the latest cached revision (an
// insert-only quill delta object, as JSON) from the database.
//
// Next, this component loads all of the existing deltas since the latest
// revision timestamp (or all deltas if no cached revision exists), ordered by
// server timestamp, and iteratively applies them to construct the latest version
// of the document. This component also keeps track of the latest delta
// timestamp seen from the server.
//
// The first synchronization operation is to upload local changes to the
// deltas collection in firestore. For efficiency, edits are cached locally
// and then periodically sent in a batch.
//
// The second synchronization operation involves subscribing to changes to
// the deltas collection in firestore. On each change to the collection snapshot,
// this component ignores deltas written before the last-seen timestamp. New
// deltas are applied to the local document snapshot, followed by any locally
// cached edits that haven't been sent back to firestore yet.
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
  const latestDeltaTimestamp = useRef();

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

  // Document will contain the latest cached and compressed version of the delta document.
  // Subscribe to deltas from other remote clients.
  useEffect(() => {
    if (!editorID || !deltasRef || !revisionTimestamp) {
      return;
    }

    if (!quillRef || !quillRef.current) {
      return;
    }
    let editor = quillRef.current.getEditor();

    if (!latestDeltaTimestamp.current) {
      latestDeltaTimestamp.current = revisionTimestamp;
    }

    console.debug(
      "Subscribing to remote deltas since",
      latestDeltaTimestamp.current.toDate()
    );

    return deltasRef
      .orderBy("timestamp", "asc")
      .where("timestamp", ">", revisionTimestamp)
      .onSnapshot((snapshot) => {
        // filter out newly committed deltas from uncommittedDeltas
        let oldUncommittedDeltas = uncommittedDeltas.current;
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

        // Compute local: latest revision + old committed deltas + old uncommitted deltas
        //                == editor content - local delta
        let local = editorContents.compose(inverseLocalDelta);
        console.debug("local", local);

        // Compute remote: latest revision + new committed deltas + new uncommitted deltas
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
        localDelta.current = diff.transform(localDelta.current);
        selectionIndex = localDelta.current.transformPosition(selectionIndex);
        console.debug("re-applying transformed local delta");
        editor.updateContents(localDelta.current);

        if (selection) {
          console.debug("updating selection index");
          editor.setSelection(selectionIndex, selection.length);
        }
      });
  }, [editorID, revisionTimestamp, deltasRef, quillRef]);

  //  return deltasRef
  //    .orderBy("timestamp", "asc")
  //    .where("timestamp", ">", revisionTimestamp)
  //    .onSnapshot((snapshot) => {
  //      let newDeltas = [];
  //      snapshot.forEach((delta) => {
  //        let data = delta.data();

  //        // Skip deltas older than the latest timestamp we have applied already
  //        let haveSeenBefore =
  //          data.timestamp.valueOf() <= latestDeltaTimestamp.current.valueOf();

  //        if (haveSeenBefore) {
  //          // console.debug("Dropping delta with timestamp ", data.timestamp);
  //          return;
  //        }

  //        let newDelta = new Delta(data.ops);

  //        // Hang the editorID off of the delta.
  //        newDelta.editorID = data.editorID;

  //        // Skip deltas from this client
  //        if (data.editorID === editorID) {
  //          // console.debug("skipping delta from this client");
  //          return;
  //        }

  //        newDeltas.push(newDelta);
  //        latestDeltaTimestamp.current = data.timestamp;
  //      });

  //      if (newDeltas.length === 0) {
  //        // console.debug("no new deltas to apply");
  //        return;
  //      }

  //      console.debug(
  //        "applying deltas to editor",
  //        JSON.stringify(newDeltas.flatMap((d) => d.ops))
  //      );

  //      // What we have:
  //      // - localDelta: the buffered local edits that haven't been uploaded yet
  //      // - editor.getContents(): document delta representing local editor content

  //      let selection = editor.getSelection();
  //      let selectionIndex = selection ? selection.index : 0;

  //      // Compute inverse of local delta.
  //      let editorContents = editor.getContents();
  //      console.debug("editorContents", editorContents);

  //      console.debug("localDelta (before)", localDelta.current);
  //      let inverseLocalDelta = localDelta.current.invert(editorContents);
  //      console.debug("inverseLocalDelta", inverseLocalDelta);

  //      // Undo local edits
  //      selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);
  //      console.debug("unapplying local delta");
  //      editor.updateContents(inverseLocalDelta);

  //      const serverFirst = true;
  //      newDeltas.forEach((delta) => {
  //        editor.updateContents(delta);
  //        selectionIndex = delta.transformPosition(selectionIndex);
  //        localDelta.current = delta.transform(localDelta.current, serverFirst);
  //      });

  //      // Reapply local edits
  //      console.debug(
  //        "re-applying transformed local delta",
  //        localDelta.current
  //      );
  //      editor.updateContents(localDelta.current);
  //      selectionIndex = localDelta.current.transformPosition(selectionIndex);

  //      if (selection) {
  //        console.debug("updating selection index");
  //        editor.setSelection(selectionIndex, selection.length);
  //      }
  //    });
  //}, [editorID, revisionTimestamp, deltasRef, quillRef]);

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
