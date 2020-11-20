import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  initialDelta,
  onDeltaSnapshot,
  timestampsAreOrdered,
} from "./delta.js";

import Delta from "quill-delta";
import ReactQuill from "react-quill";
import UserAuthContext from "../auth/UserAuthContext.js";
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
export default function CollabEditor(props) {
  // revisionCache.current value is an object with fields:
  // - delta: full document delta
  // - timestamp: ts of the last edit
  const revisionCache = useRef();

  const editorReady = useRef();

  const readyChannel = new MessageChannel();
  const readyChannelSend = readyChannel.port1;
  const readyChannelReceive = readyChannel.port2;

  readyChannelReceive.onmessage = () => {
    if (!editorReady.current && props.onReady) {
      props.onReady();
    }
  };

  return (
    <CollabEditorWithCache
      readyPort={readyChannelSend}
      revisionCache={revisionCache}
      {...props}
    />
  );
}

function CollabEditorWithCache({
  quillRef,
  readyPort,
  revisionCache,
  deltasRef,
  revisionsRef,
  onLoad,
  onChange,
  syncPeriod,
  ...otherProps
}) {
  const [editorID] = useState(uuidv4());

  // revision.current value is an object with fields:
  // - delta: full document delta
  // - timestamp: ts of the last edit
  const [revision, setRevision] = useState();

  // uncommitted Deltas have been sent to the database
  // but not yet seen in the canonical edit stream
  const uncommittedDeltas = useRef([]);

  // localDelta is a buffer of local changes, not yet
  // sent to the database.
  const localDelta = useRef(new Delta([]));

  const { oauthClaims } = useContext(UserAuthContext);

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
        let newRevision = {
          delta: initialDelta(),
          timestamp: new firebaseClient.firestore.Timestamp(0, 0),
        };
        if (snapshot.size === 0) {
          revisionCache.current = newRevision;
          setRevision(newRevision);
          return;
        }

        let revisionData = snapshot.docs[0].data();
        newRevision.delta = new Delta(revisionData.delta.ops);
        if (revisionData.timestamp) {
          newRevision.timestamp = revisionData.timestamp;
        }
        if (
          !revisionCache.current ||
          timestampsAreOrdered(
            revisionCache.current.timestamp,
            newRevision.timestamp
          )
        ) {
          revisionCache.current = newRevision;
        }
        setRevision(newRevision);
      });
  }, [revisionsRef, revisionCache]);

  // Document will contain the latest cached and compressed version of the
  // delta document. Subscribe to deltas from other remote clients.
  useEffect(() => {
    if (!editorID || !deltasRef || !revision) {
      return;
    }

    if (!quillRef || !quillRef.current) {
      return;
    }
    let editor = quillRef.current.getEditor();

    console.debug(
      "Subscribing to remote deltas since",
      revision.timestamp.toDate()
    );

    return deltasRef
      .orderBy("timestamp", "asc")
      .where("timestamp", ">", revision.timestamp)
      .onSnapshot(
        onDeltaSnapshot(
          uncommittedDeltas,
          revisionCache,
          editor,
          localDelta,
          readyPort
        )
      );
  }, [editorID, revision, revisionCache, deltasRef, quillRef, readyPort]);

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

  if (!revision) return <></>;

  return (
    <ReactQuill
      ref={quillRef}
      onChange={onEdit}
      defaultValue={revisionCache.delta}
      scrollingContainer="#editorScrollContainer"
      modules={{
        history: {
          delay: 2000,
          maxStack: 500,
          userOnly: true,
        },
      }}
      {...otherProps}
    />
  );
}
