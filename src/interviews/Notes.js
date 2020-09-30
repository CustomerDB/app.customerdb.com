import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import CollabEditor from "../editor/CollabEditor.js";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import HighlightBlot from "./HighlightBlot.js";
import HighlightHints from "./HighlightHints.js";
import Quill from "quill";
import SelectionFAB from "./SelectionFAB.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

Quill.register("formats/highlight", HighlightBlot);

// Synchronize every second (1000ms).
const syncPeriod = 1000;

// Notes augments a collaborative editor with tags and text highlights.
export default function Notes(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { documentRef, highlightsRef } = useFirestore();

  const [toolbarHeight, setToolbarHeight] = useState(40);

  const [tagIDsInSelection, doSetTagIDsInSelection] = useState(new Set());
  const [currentSelection, doSetCurrentSelection] = useState();
  const quillContainerRef = useRef();

  const setTagIDsInSelection = (value) => {
    console.debug("setTagIDsInSelection", value);
    doSetTagIDsInSelection(value);
  };

  const setCurrentSelection = (value) => {
    console.debug("setCurrentSelection", value);
    doSetCurrentSelection(value);
  };

  useEffect(() => {
    console.debug("changed: oauthClaims", oauthClaims);
  }, [oauthClaims]);

  useEffect(() => {
    console.debug("changed: firebase");
  }, [firebase]);

  useEffect(() => {
    console.debug("changed: orgID");
  }, [orgID]);

  useEffect(() => {
    console.debug("changed: props", props);
  }, [props]);

  useEffect(() => {
    console.debug("changed: documentRef");
  }, [documentRef]);

  useEffect(() => {
    console.debug("changed: highlightsRef");
  }, [highlightsRef]);

  useEffect(() => {
    console.debug("changed: toolbarHeight", toolbarHeight);
  }, [toolbarHeight]);

  useEffect(() => {
    console.debug("changed: tagIDsInSelection", tagIDsInSelection);
  }, [tagIDsInSelection]);

  useEffect(() => {
    console.debug("changed: currentSelection", currentSelection);
  }, [currentSelection]);

  const highlights = useRef();

  // Subscribe to window resize events because hint offsets need to be
  // recomputed if the browser zoom level changes.
  useEffect(() => {
    const onResize = () => {
      let editorNode = document.getElementById("quill-notes-editor");
      if (editorNode) {
        let toolbarNodes = editorNode.getElementsByClassName("ql-toolbar");
        if (toolbarNodes.length > 0) {
          let rects = toolbarNodes[0].getClientRects();
          if (rects.length > 0) {
            setToolbarHeight(Math.round(rects[0].height));
          }
        }
      }
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Returns the index and length of the highlight with the supplied ID
  // in the current editor.
  const getHighlightIDsFromEditor = () => {
    let result = new Set();
    let editorNode = document.getElementById("quill-notes-editor");
    if (editorNode) {
      let domNodes = editorNode.getElementsByClassName("inline-highlight");
      for (let i = 0; i < domNodes.length; i++) {
        let highlightID = domNodes[i].dataset.highlightID;
        if (highlightID) {
          result.add(highlightID);
        }
      }
    }
    return result;
  };

  // selection: a range object with fields 'index' and 'length'
  const computeTagIDsInSelection = (selection) => {
    let intersectingHighlights = computeHighlightsInSelection(selection);

    let result = new Set();
    if (!intersectingHighlights) {
      return result;
    }

    intersectingHighlights.forEach((h) => result.add(h.tagID));
    return result;
  };

  // selection: a range object with fields 'index' and 'length'
  const computeHighlightsInSelection = (selection) => {
    if (!props.reactQuillRef || !props.reactQuillRef.current) {
      return [];
    }

    let editor = props.reactQuillRef.current.getEditor();

    let result = [];

    if (selection === undefined) {
      return result;
    }

    let length = selection.length > 0 ? selection.length : 1;
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

  const getHighlightFromEditor = useCallback(
    (highlightID) => {
      if (!props.reactQuillRef || !props.reactQuillRef.current) {
        return;
      }
      let editor = props.reactQuillRef.current.getEditor();

      let domNodes = document.getElementsByClassName(
        `highlight-${highlightID}`
      );

      if (!domNodes || domNodes.length === 0) return undefined;

      let index = Number.MAX_VALUE;
      let end = 0;
      let textSegments = [];
      let tagID = "";

      for (let i = 0; i < domNodes.length; i++) {
        let domNode = domNodes[i];
        tagID = domNode.dataset.tagID;

        let blot = Quill.find(domNode, false);
        if (!blot) continue;

        let blotIndex = editor.getIndex(blot);
        index = Math.min(index, blotIndex);
        end = Math.max(end, blotIndex + blot.length());
        textSegments.push(editor.getText(blotIndex, blot.length()));
      }

      if (textSegments.length === 0) return undefined;

      let text = textSegments.join(" ");

      let length = end - index;

      return {
        tagID: tagID,
        selection: {
          index: index,
          length: length,
        },
        text: text,
      };
    },
    [props.reactQuillRef]
  );

  const setEqual = (a, b) =>
    a.size === b.size && [...a].every((value) => b.has(value));

  // onChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const onChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }

    console.debug("current selection range", range);
    setCurrentSelection(range);

    let newTagIDs = computeTagIDsInSelection(range);
    if (!setEqual(newTagIDs, tagIDsInSelection)) {
      setTagIDsInSelection(newTagIDs);
    }
  };

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = (tag, checked) => {
    console.debug("onTagControlChange", tag, checked, currentSelection);
    if (!props.reactQuillRef || !props.reactQuillRef.current) {
      console.log("Doesn't have the quill ref - quitting");
      return;
    }
    let editor = props.reactQuillRef.current.getEditor();

    if (currentSelection === undefined) {
      return;
    }

    let selection = currentSelection;

    if (checked) {
      console.debug("formatting highlight with tag ", tag);

      let highlightID = uuidv4();

      editor.formatText(
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
        console.debug(
          "deleting highlight format in current selection with tag ",
          tag
        );

        editor.formatText(
          h.selection.index,
          h.selection.length,
          "highlight",
          false, // unsets the target format
          "user"
        );
      });
    }

    let newRange = {
      index: selection.index + selection.length,
      length: 0,
    };
    editor.setSelection(newRange, "user");
    setCurrentSelection(newRange);
    setTagIDsInSelection(computeTagIDsInSelection(newRange));
  };

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    if (!highlightsRef || !props.document.ID || !oauthClaims.email) {
      return;
    }

    // This function sends any new highlights to the database.
    const syncHighlightsCreate = () => {
      if (!props.reactQuillRef || !props.reactQuillRef.current) {
        return;
      }

      if (!highlights.current) {
        return;
      }

      let editorHighlightIDs = getHighlightIDsFromEditor();
      editorHighlightIDs.forEach((highlightID) => {
        if (!highlights.current.hasOwnProperty(highlightID)) {
          let current = getHighlightFromEditor(highlightID);

          if (!current) return;

          let newHighlight = {
            ID: highlightID,
            organizationID: orgID,
            documentID: props.document.ID,
            tagID: current.tagID,
            personID: props.document.personID || "",
            selection: {
              index: current.selection.index,
              length: current.selection.length,
            },
            text: current.text,
            createdBy: oauthClaims.email,
            creationTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
            deletionTimestamp: props.document.deletionTimestamp,
            lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
          };

          console.debug(
            "syncHighlightsCreate: creating highlight",
            newHighlight
          );

          event(firebase, "create_highlight", {
            orgID: oauthClaims.orgID,
            userID: oauthClaims.user_id,
          });

          highlightsRef.doc(highlightID).set(newHighlight);
        }
      });
    };

    // This function sends any local updates to highlight content relative
    // to the local editor to the database.
    const syncHighlightsUpdate = () => {
      if (!props.reactQuillRef || !props.reactQuillRef.current) {
        return;
      }

      if (!highlights.current) {
        return;
      }

      // Update or delete highlights based on local edits.
      Object.values(highlights.current).forEach((h) => {
        let current = getHighlightFromEditor(h.ID);

        if (current === undefined) {
          // highlight is not present; delete it in the database.
          console.debug("syncHighlightsUpdate: deleting highlight", h);

          event(firebase, "delete_highlight", {
            orgID: oauthClaims.orgID,
            userID: oauthClaims.user_id,
          });

          highlightsRef.doc(h.ID).delete();
          return;
        }

        if (
          current.tagID !== h.tagID ||
          current.selection.index !== h.selection.index ||
          current.selection.length !== h.selection.length ||
          current.text !== h.text
        ) {
          console.debug("syncHighlightsUpdate: updating highlight", h, current);

          // upload diff
          highlightsRef.doc(h.ID).set(
            {
              tagID: current.tagID,
              personID: props.document.personID || "",
              selection: {
                index: current.selection.index,
                length: current.selection.length,
              },
              text: current.text,
              deletionTimestamp: props.document.deletionTimestamp,
              lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      });
    };

    console.debug(`starting periodic syncHighlights every ${syncPeriod}ms`);
    let syncHighlightsCreateInterval = setInterval(
      syncHighlightsCreate,
      syncPeriod
    );
    let syncHighlightsUpdateInterval = setInterval(
      syncHighlightsUpdate,
      syncPeriod
    );
    return () => {
      clearInterval(syncHighlightsCreateInterval);
      clearInterval(syncHighlightsUpdateInterval);
    };
  }, [
    oauthClaims,
    highlightsRef,
    orgID,
    getHighlightFromEditor,
    props.document.ID,
    props.document.deletionTimestamp,
    props.document.personID,
    props.reactQuillRef,
    firebase,
  ]);

  // Subscribe to highlight changes
  useEffect(() => {
    if (!highlightsRef) {
      return;
    }

    return highlightsRef.onSnapshot((snapshot) => {
      let newHighlights = {};

      snapshot.forEach((highlightDoc) => {
        let data = highlightDoc.data();
        data["ID"] = highlightDoc.id;
        newHighlights[data.ID] = data;
      });

      highlights.current = newHighlights;
    });
  }, [highlightsRef]);

  if (!documentRef) {
    return <></>;
  }

  return (
    <Grid
      ref={quillContainerRef}
      item
      xs={12}
      style={{ position: "relative" }}
      spacing={0}
    >
      <CollabEditor
        revisionsRef={documentRef.collection("revisions")}
        deltasRef={documentRef.collection("deltas")}
        quillRef={props.reactQuillRef}
        id="quill-notes-editor"
        theme="snow"
        placeholder="Start typing here and select to mark highlights"
        onChangeSelection={onChangeSelection}
        modules={{
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline", "strike", "blockquote"],
            [
              { list: "ordered" },
              { list: "bullet" },
              { indent: "-1" },
              { indent: "+1" },
            ],
            ["link", "image"],
            ["clean"],
          ],
        }}
      />

      <SelectionFAB
        toolbarHeight={toolbarHeight}
        selection={currentSelection}
        tags={props.tags}
        tagIDsInSelection={tagIDsInSelection}
        onTagControlChange={onTagControlChange}
      />

      <HighlightHints
        toolbarHeight={toolbarHeight}
        highlights={highlights.current}
        tags={props.tags}
      />
    </Grid>
  );
}
