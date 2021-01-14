import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  initialDelta,
  onDeltaSnapshot,
  timestampsAreOrdered,
} from "./delta.js";

import UserAuthContext from "../auth/UserAuthContext.js";
import { v4 as uuidv4 } from "uuid";
import Quill from "quill";
import Delta from "quill-delta";
import ReactQuill from "react-quill";
import QuillCursors from "quill-cursors";
import { debounce } from "debounce";
import { colorForString } from "../util/color.js";

Quill.register("modules/cursors", QuillCursors);

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
export default function CollabEditor({ modules, onReady, ...otherProps }) {
  // revisionCache.current value is an object with fields:
  // - delta: full document delta
  // - timestamp: ts of the last edit
  const revisionCache = useRef();

  const editorReady = useRef();

  const readyChannel = new MessageChannel();
  const readyChannelSend = readyChannel.port1;
  const readyChannelReceive = readyChannel.port2;

  readyChannelReceive.onmessage = () => {
    if (!editorReady.current && onReady) {
      onReady();
    }
  };

  const newModules = Object.assign(
    {
      cursors: {
        selectionChangeSource: "cursors",
        transformOnTextChange: true,
      },
    },
    modules
  );

  return (
    <CollabEditorWithCache
      readyPort={readyChannelSend}
      revisionCache={revisionCache}
      modules={newModules}
      onReady={onReady}
      {...otherProps}
    />
  );
}

function CollabEditorWithCache({
  quillRef,
  authorID,
  authorName,
  readyPort,
  revisionCache,
  deltasRef,
  revisionsRef,
  cursorsRef,
  onLoad,
  onChange,
  onChangeSelection,
  formatBlacklist,
  ...otherProps
}) {
  const [editorID] = useState(uuidv4());

  console.debug("authorID", authorID);
  console.debug("authorName", authorName);

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

  // This function sends the contents of `localDelta` to the database
  // and resets the local cache.
  const syncDeltas = useCallback(
    debounce(() => {
      let opsIndex = localDelta.current.ops.length;
      if (opsIndex === 0) {
        return;
      }

      let ops = localDelta.current.ops.slice(0, opsIndex);

      if (formatBlacklist) {
        ops.forEach((op) => {
          if (!op.attributes) {
            return;
          }
          formatBlacklist.forEach((blacklistKey) => {
            delete op.attributes[blacklistKey];
          });
        });
      }

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
      return deltasRef.doc(deltaID).set(deltaDoc);
    }, 250),
    [deltasRef, editorID, oauthClaims]
  );

  const updateCursor = debounce((editor, editorID, authorID, authorName) => {
    if (!editor || !cursorsRef || !editorID) {
      return;
    }
    const range = editor.getSelection();
    if (!range) {
      return cursorsRef.doc(authorID).delete();
    }

    const cursorRecord = {
      ID: authorID,
      editorID: editorID,
      name: authorName,
      selection: {
        index: range.index,
        length: range.length,
      },
      lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
    };

    return cursorsRef.doc(authorID).set(cursorRecord);
  }, 250);

  // onEdit builds a batch of local edits in `localDelta`
  // which are sent to the server and reset in `syncDeltas()`.
  const onEdit = useCallback(
    (content, delta, source, editor) => {
      if (source !== "user") {
        return;
      }

      localDelta.current = localDelta.current.compose(delta);

      syncDeltas();

      if (onChange) {
        onChange(content, delta, source, editor);
      }
    },
    [onChange, syncDeltas]
  );

  const onSelect = (range, source, editor) => {
    if (source === "cursors") {
      return updateCursor(editor, editorID, authorID, authorName);
    }

    if (source === "user") {
      updateCursor(editor, editorID, authorID, authorName);
    }

    if (onChangeSelection) {
      onChangeSelection(range, source, editor);
    }
  };

  // Subscribe to peer editor's cursors
  useEffect(() => {
    if (!cursorsRef || !editorID || !quillRef) {
      return;
    }

    return cursorsRef
      .where("lastUpdateTimestamp", ">", new Date(Date.now() - 1000 * 30))
      .onSnapshot((snapshot) => {
        if (!quillRef.current) return;
        const editor = quillRef.current.getEditor();
        const cursors = editor.getModule("cursors");

        const cursorData = {};
        snapshot.docs.forEach((doc) => {
          // Skip the cursor record for this editor,
          // but first update position if not current
          const cursor = doc.data();
          if (cursor.editorID === editorID) {
            const selection = editor.getSelection();
            if (
              (selection && cursor.selection.index !== selection.index) ||
              (selection && cursor.selection.length !== selection.length)
            ) {
              updateCursor(editor, editorID, authorID, authorName);
            }
            return;
          }
          cursorData[doc.id] = cursor;
        });

        // Add and update cursor positions
        Object.values(cursorData).forEach((cursor) => {
          console.debug("adding cursor", cursor);
          const color = colorForString(cursor.ID);
          cursors.createCursor(cursor.ID, cursor.name, color);
          cursors.toggleFlag(cursor.ID, true);
          cursors.moveCursor(cursor.ID, cursor.selection);
        });

        // Delete expired cursors
        const domCursors = cursors.cursors();
        domCursors.forEach((domCursor) => {
          if (!cursorData[domCursor.id]) {
            cursors.removeCursor(domCursor.id);
          }
        });

        // Redraw all cursors in the DOM
        cursors.update();
      });
  }, [cursorsRef, editorID, quillRef, authorID, authorName, updateCursor]);

  if (!revision) return <></>;

  return (
    <ReactQuill
      ref={quillRef}
      onChange={onEdit}
      onChangeSelection={onSelect}
      defaultValue={revisionCache.delta}
      scrollingContainer="#editorScrollContainer"
      {...otherProps}
    />
  );
}
