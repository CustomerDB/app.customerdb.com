import React, { useContext, useEffect, useRef, useState } from "react";

import Delta from "quill-delta";
import ReactQuill from "react-quill";
import UserAuthContext from "../auth/UserAuthContext.js";
import { initialDelta } from "./delta.js";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";

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
  objectRef,
  editor,
  onLoad,
  syncPeriod,
  ...otherProps
}) {
  const [editorID] = useState(nanoid());
  const [revisionDelta, setRevisionDelta] = useState();
  const [revisionTimestamp, setRevisionTimestamp] = useState();

  const { oauthClaims } = useContext(UserAuthContext);

  const { revisionsRef, deltasRef } = useFirestore();

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
          setRevisionTimestamp(new window.firebase.firestore.Timestamp(0, 0));
          return;
        }

        // hint: limit 1 -- iterating over a list of exactly 1
        snapshot.forEach((doc) => {
          let revision = doc.data();
          setRevisionDelta(new Delta(revision.delta.ops));
          if (!revision.timestamp) {
            setRevisionTimestamp(new window.firebase.firestore.Timestamp(0, 0));
            return;
          }
          setRevisionTimestamp(revision.timestamp);
        });
      });
  }, [revisionsRef]);

  // Document will contain the latest cached and compressed version of the delta document.
  // Subscribe to deltas from other remote clients.
  useEffect(() => {
    if (!editorID || !editor || !deltasRef || !revisionTimestamp) {
      return;
    }

    if (!latestDeltaTimestamp.current) {
      latestDeltaTimestamp.current = revisionTimestamp;
    }

    console.debug(
      "Subscribing to deltas since",
      latestDeltaTimestamp.current.toDate()
    );

    return deltasRef
      .orderBy("timestamp", "asc")
      .where("timestamp", ">", latestDeltaTimestamp.current)
      .onSnapshot((snapshot) => {
        // console.debug("Delta snapshot received");

        let newDeltas = [];
        snapshot.forEach((delta) => {
          let data = delta.data();

          // Skip deltas with no timestamp
          if (data.timestamp === null) {
            // console.debug("skipping delta with no timestamp");
            return;
          }

          // Skip deltas older than the latest timestamp we have applied already
          let haveSeenBefore =
            data.timestamp.valueOf() <= latestDeltaTimestamp.current.valueOf();

          if (haveSeenBefore) {
            // console.debug("Dropping delta with timestamp ", data.timestamp);
            return;
          }

          let newDelta = new Delta(data.ops);

          // Hang the editorID off of the delta.
          newDelta.editorID = data.editorID;

          // Skip deltas from this client
          if (data.editorID === editorID) {
            // console.debug("skipping delta from this client");
            return;
          }

          newDeltas.push(newDelta);
          latestDeltaTimestamp.current = data.timestamp;
        });

        if (newDeltas.length === 0) {
          // console.debug("no new deltas to apply");
          return;
        }

        console.debug("applying deltas to editor", newDeltas);

        // What we have:
        // - localDelta: the buffered local edits that haven't been uploaded yet
        // - editor.getContents(): document delta representing local editor content

        let selection = editor.getSelection();
        let selectionIndex = selection ? selection.index : 0;

        // Compute inverse of local delta.
        let editorContents = editor.getContents();
        console.debug("editorContents", editorContents);

        console.debug("localDelta (before)", localDelta.current);
        let inverseLocalDelta = localDelta.current.invert(editorContents);
        console.debug("inverseLocalDelta", inverseLocalDelta);

        // Undo local edits
        console.debug("unapplying local delta");
        editor.updateContents(inverseLocalDelta);
        selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);

        newDeltas.forEach((delta) => {
          editor.updateContents(delta);
          selectionIndex = delta.transformPosition(selectionIndex);

          console.debug("transform local delta");
          const serverFirst = true;
          localDelta.current = delta.transform(localDelta.current, serverFirst);
        });

        // Reapply local edits
        console.debug("applying transformed local delta", localDelta.current);
        editor.updateContents(localDelta.current);
        selectionIndex = localDelta.current.transformPosition(selectionIndex);

        if (selection) {
          console.debug("updating selection index");
          editor.setSelection(selectionIndex, selection.length);
        }
      });
  }, [editorID, editor, revisionTimestamp, deltasRef]);

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

      let deltaDoc = {
        editorID: editorID,
        userEmail: oauthClaims.email,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        ops: ops,
      };

      console.debug("uploading delta", deltaDoc);
      deltasRef.doc().set(deltaDoc);
    };

    console.debug(`starting periodic syncDeltas every ${deltaSyncPeriod}ms`);
    let syncDeltaInterval = setInterval(syncDeltas, deltaSyncPeriod);

    return () => {
      clearInterval(syncDeltaInterval);
    };
  }, [deltasRef, editorID, oauthClaims.email, deltaSyncPeriod]);

  // onEdit builds a batch of local edits in `localDelta`
  // which are sent to the server and reset to [] periodically
  // in `syncDeltas()`.
  const onChange = (content, delta, source, editor) => {
    if (source !== "user") {
      console.debug("onChange: skipping non-user change", delta, source);
      return;
    }

    localDelta.current = localDelta.current.compose(delta);

    if (otherProps.onChange) {
      otherProps.onChange(content, delta, source, editor);
    }
  };

  if (!revisionDelta) return <></>;

  return (
    <ReactQuill
      onChange={onChange}
      defaultValue={revisionDelta}
      {...otherProps}
    />
  );
}
