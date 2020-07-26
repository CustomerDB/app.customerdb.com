import React, { useContext, useState, useEffect, useRef } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import ReactQuill from "react-quill";
import Delta from "quill-delta";
import Quill from "quill";
import { nanoid } from "nanoid";

import { useParams } from "react-router-dom";

import "react-quill/dist/quill.bubble.css";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";

import Tabs from "../shell/Tabs.js";

import Scrollable from "../shell/Scrollable.js";
import Tags, { addTagStyles, removeTagStyles } from "./Tags.js";
import HighlightBlot from "./HighlightBlot.js";

import { emptyDelta } from "./delta.js";

Quill.register("formats/highlight", HighlightBlot);

// Synchronize every second (1000ms).
const syncPeriod = 1000;

// ContentsPane is a React component that allows multiple users to edit
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
// On page load, this component loads all of the existing deltas ordered by
// server timestamp, and iteratively applies them to construct an initial
// document snapshot. This component also keeps track of the latest delta
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
//
// This component also manages tags and text highlights. When this component
// renders, it generates text formatting deltas on the fly to visually
// communicate what text segments are associated with tags with background
// colors.
export default function ContentsPane(props) {
  const auth = useContext(UserAuthContext);
  const { orgID } = useParams();

  const [editorID, setEditorID] = useState(nanoid());

  const reactQuillRef = useRef(null);

  const [initialDelta, setInitialDelta] = useState(emptyDelta());
  const [tagIDsInSelection, setTagIDsInSelection] = useState(new Set());
  const [tags, setTags] = useState();

  let localDelta = useRef(new Delta([]));
  let latestDeltaTimestamp = useRef(
    new window.firebase.firestore.Timestamp(0, 0)
  );

  let currentSelection = useRef();

  let highlights = useRef();

  // Document will contain the latest cached and compressed version of the delta document.
  useEffect(() => {
    if (!props.document) {
      return;
    }
    setInitialDelta(new Delta(props.document.latestSnapshot.ops));
    latestDeltaTimestamp.current = props.document.latestSnapshotTimestamp;
  }, [props.document]);

  // Subscribe to deltas from other remote clients.
  useEffect(() => {
    if (!reactQuillRef.current || !props.documentRef) {
      return;
    }

    console.debug(
      "latestDeltaTimestamp.current: ",
      latestDeltaTimestamp.current
    );

    return props.documentRef
      .collection("deltas")
      .orderBy("timestamp", "asc")
      .where("timestamp", ">", latestDeltaTimestamp.current)
      .onSnapshot((snapshot) => {
        console.debug("Delta snapshot received");

        let newDeltas = [];
        snapshot.forEach((delta) => {
          let data = delta.data();

          // Skip deltas with no timestamp
          if (data.timestamp === null) {
            console.debug("skipping delta with no timestamp");
            return;
          }

          // Skip deltas older than the latest timestamp we have applied already
          let haveSeenBefore =
            data.timestamp.valueOf() <= latestDeltaTimestamp.current.valueOf();

          if (haveSeenBefore) {
            console.debug("Dropping delta with timestamp ", data.timestamp);
            return;
          }

          let newDelta = new Delta(data.ops);

          // Hang the editorID off of the delta.
          newDelta.editorID = data.editorID;

          // Skip deltas from this client
          if (data.editorID === editorID) {
            console.debug("skipping delta from this client");
            return;
          }

          newDeltas.push(newDelta);
          latestDeltaTimestamp.current = data.timestamp;
        });

        if (newDeltas.length === 0) {
          console.debug("no new deltas to apply");
          return;
        }

        console.debug("applying deltas to editor", newDeltas);

        let editor = reactQuillRef.current.getEditor();

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
          console.debug("editor.updateContents", delta);
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
  }, [reactQuillRef, props.documentRef]);

  // Subscribe to tags for the document's tag group.
  useEffect(() => {
    if (!props.document || !props.document.tagGroupID) {
      return;
    }

    let unsubscribe = props.tagGroupsRef
      .doc(props.document.tagGroupID)
      .collection("tags")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newTags[data.ID] = data;
        });
        setTags(newTags);
        addTagStyles(newTags);
      });
    return () => {
      removeTagStyles();
      unsubscribe();
    };
  }, [props.document]);

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    let syncDeltaInterval = setInterval(syncDeltas, syncPeriod);
    let syncHighlightsInterval = setInterval(syncHighlights, syncPeriod);
    return () => {
      clearInterval(syncDeltaInterval);
      clearInterval(syncHighlightsInterval);
    };
  }, []);

  // Subscribe to highlight changes
  useEffect(() => {
    return props.documentRef.collection("highlights").onSnapshot((snapshot) => {
      let newHighlights = {};

      snapshot.forEach((highlightDoc) => {
        let data = highlightDoc.data();
        data["ID"] = highlightDoc.id;
        newHighlights[data.ID] = data;
      });

      console.debug("Received newHighlights ", newHighlights);

      highlights.current = newHighlights;
    });
  }, []);

  // Returns the index and length of the highlight with the supplied ID
  // in the current editor.
  const getHighlightIDsFromEditor = () => {
    let result = new Set();
    let domNodes = document.getElementsByClassName("inline-highlight");
    for (let i = 0; i < domNodes.length; i++) {
      let highlightID = domNodes[i].dataset.highlightID;
      if (highlightID) {
        result.add(highlightID);
      }
    }
    return result;
  };

  // selection: a range object with fields 'index' and 'length'
  const computeTagIDsInSelection = (selection) => {
    let intersectingHighlights = computeHighlightsInSelection(selection);

    let result = new Set();
    intersectingHighlights.forEach((h) => result.add(h.tagID));
    return result;
  };

  // selection: a range object with fields 'index' and 'length'
  const computeHighlightsInSelection = (selection) => {
    let result = [];

    if (selection === undefined) {
      return result;
    }

    let length = selection.length > 0 ? selection.length : 1;
    let editor = reactQuillRef.current.getEditor();
    let selectionDelta = editor.getContents(selection.index, length);
    let selectedHighlightIDs = [];

    selectionDelta.ops.forEach((op) => {
      if (op.attributes && op.attributes.highlight) {
        selectedHighlightIDs.push(op.attributes.highlight.highlightID);
      }
    });

    return selectedHighlightIDs.flatMap((id) => {
      let highlight = getHighlightFromEditor(id);
      if (highlight) return [highlight];
      return [];
    });
  };

  const getHighlightFromEditor = (highlightID) => {
    let domNode = document.getElementById(`highlight-${highlightID}`);

    if (!domNode) return undefined;

    let tagID = domNode.dataset.tagID;
    let blot = Quill.find(domNode, false);

    if (!blot) return undefined;

    let editor = reactQuillRef.current.getEditor();
    let index = editor.getIndex(blot);
    let length = blot.length();
    let text = editor.getText(index, length);

    return {
      tagID: tagID,
      selection: {
        index: index,
        length: length,
      },
      text: text,
    };
  };

  // onEdit builds a batch of local edits in `localDelta`
  // which are sent to the server and reset to [] periodically
  // in `syncDeltas()`.
  const onEdit = (content, delta, source, editor) => {
    if (source !== "user") {
      console.debug("onEdit: skipping non-user change", delta, source);
      return;
    }

    localDelta.current = localDelta.current.compose(delta);
  };

  // onSelect is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const onSelect = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }

    console.debug("current selection range", range);
    currentSelection.current = range;
    setTagIDsInSelection(computeTagIDsInSelection(range));
  };

  // uploadDeltas is invoked periodically by a timer.
  //
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
      userEmail: auth.oauthUser.email,
      timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      ops: ops,
    };

    console.debug("uploading delta", deltaDoc);
    props.documentRef.collection("deltas").doc().set(deltaDoc);
  };

  // This function sends any local updates to highlight content relative
  // to the local editor to the database.
  const syncHighlights = () => {
    if (!reactQuillRef.current) {
      return;
    }

    const highlightsRef = props.documentRef.collection("highlights");

    // Update or delete highlights based on local edits.
    Object.values(highlights.current).forEach((h) => {
      let current = getHighlightFromEditor(h.ID);

      if (current === undefined) {
        // highlight is not present; delete it in the database.
        console.debug("syncHighlights: deleting highlight", h);
        highlightsRef.doc(h.ID).delete();
        return;
      }

      if (
        current.tagID !== h.tagID ||
        current.selection.index !== h.selection.index ||
        current.selection.length !== h.selection.length ||
        current.text !== h.text
      ) {
        console.debug("syncHighlights: updating highlight", h, current);

        // upload diff
        highlightsRef.doc(h.ID).set(
          {
            tagID: current.tagID,
            selection: {
              index: current.selection.index,
              length: current.selection.length,
            },
            text: current.text,
            lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    });

    let editorHighlightIDs = getHighlightIDsFromEditor();
    editorHighlightIDs.forEach((highlightID) => {
      let current = getHighlightFromEditor(highlightID);
      if (
        current !== undefined &&
        !highlights.current.hasOwnProperty(highlightID)
      ) {
        let newHighlight = {
          ID: highlightID,
          organizationID: orgID,
          documentID: props.document.ID,
          tagID: current.tagID,
          selection: {
            index: current.selection.index,
            length: current.selection.length,
          },
          text: current.text,
          createdBy: auth.oauthUser.email,
          creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        };

        console.debug("syncHighlights: creating highlight", newHighlight);
        highlightsRef.doc(highlightID).set(newHighlight);
      }
    });
  };

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = (tag, checked) => {
    console.debug("onTagControlChange", tag, checked, currentSelection);

    if (currentSelection.current === undefined) {
      return;
    }

    let selection = currentSelection.current;

    let editor = reactQuillRef.current.getEditor();

    if (checked) {
      console.debug("formatting highlight with tag ", tag);
      let selectionText = editor.getText(selection.index, selection.length);

      let highlightID = nanoid();

      let delta = editor.formatText(
        selection.index,
        selection.length,
        "highlight",
        { highlightID: highlightID, tagID: tag.ID },
        "user"
      );
    }

    if (!checked) {
      let intersectingHighlights = computeHighlightsInSelection(selection);

      intersectingHighlights.forEach((h) => {
        if (h.tagID === tag.ID) {
          console.debug(
            "deleting highlight format in current selection with tag ",
            tag
          );

          let delta = editor.removeFormat(
            h.selection.index,
            h.selection.length,
            "highlight",
            false, // unsets the target format
            "user"
          );

          localDelta.current = localDelta.current.compose(delta);
        }
      });
    }

    let tagIDs = computeTagIDsInSelection(selection);
    setTagIDsInSelection(tagIDs);
  };

  return (
    <>
      <Tabs.Content>
        <Scrollable>
          <ReactQuill
            ref={reactQuillRef}
            defaultValue={initialDelta}
            theme="bubble"
            placeholder="Start typing here and select to mark highlights"
            onChange={onEdit}
            onChangeSelection={onSelect}
          />
        </Scrollable>
      </Tabs.Content>
      <Tabs.SidePane>
        <Tabs.SidePaneCard>
          <Tags
            tags={tags}
            tagIDsInSelection={tagIDsInSelection}
            onChange={onTagControlChange}
          />
        </Tabs.SidePaneCard>
      </Tabs.SidePane>
    </>
  );
}
