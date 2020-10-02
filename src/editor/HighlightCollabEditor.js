import * as firebaseClient from "firebase/app";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import CollabEditor from "./CollabEditor.js";
import FirebaseContext from "../util/FirebaseContext.js";
import HighlightBlot from "../interviews/HighlightBlot.js";
import HighlightHints from "../interviews/HighlightHints.js";
import Quill from "quill";
import SelectionFAB from "../interviews/SelectionFAB.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

Quill.register("formats/highlight", HighlightBlot);

export default function HighlightCollabEditor({
  quillRef,
  document,
  highlightsRef,
  tags,
  onChangeSelection,
  ...otherProps
}) {
  const selectionRef = useRef();

  // thisOnChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const thisOnChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }
    selectionRef.current = range;
    if (onChangeSelection) {
      onChangeSelection(range, source, editor);
    }
  };

  return (
    <>
      <CollabEditor
        quillRef={quillRef}
        onChangeSelection={thisOnChangeSelection}
        {...otherProps}
      />
      <HighlightControls
        quillRef={quillRef}
        selectionRef={selectionRef}
        highlightsRef={highlightsRef}
        highlightDocument={document}
        tags={tags}
      />
    </>
  );
}

// Synchronize every second (1000ms).
const syncPeriod = 1000;

function HighlightControls({
  quillRef,
  selectionRef,
  highlightsRef,
  highlightDocument,
  tags,
}) {
  const firebase = useContext(FirebaseContext);
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const [toolbarHeight, setToolbarHeight] = useState(40);
  const [selection, setSelection] = useState();
  const selectionCache = useRef();
  const [highlights, setHighlights] = useState();
  const highlightsCache = useRef();
  const [tagIDsInSelection, setTagIDsInSelection] = useState(new Set());

  const getHighlightFromEditor = useCallback(
    (highlightID) => {
      if (!quillRef || !quillRef.current) {
        return;
      }
      let editor = quillRef.current.getEditor();
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
    [quillRef]
  );

  // selection: a range object with fields 'index' and 'length'
  const computeHighlightsInSelection = useCallback(
    (selection) => {
      if (!quillRef || !quillRef.current) {
        return [];
      }
      let editor = quillRef.current.getEditor();
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
    },
    [quillRef, getHighlightFromEditor]
  );

  // selection: a range object with fields 'index' and 'length'
  const computeTagIDsInSelection = useCallback(
    (selection) => {
      let intersectingHighlights = computeHighlightsInSelection(selection);
      let result = new Set();
      if (!intersectingHighlights) {
        return result;
      }
      intersectingHighlights.forEach((h) => result.add(h.tagID));
      return result;
    },
    [computeHighlightsInSelection]
  );

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

  // Periodically update selection state
  useEffect(() => {
    if (!selectionCache) return;

    const cancel = setInterval(() => {
      let newSelection = selectionRef.current;
      if (!newSelection) return;
      if (
        !selectionCache.current ||
        newSelection.index !== selectionCache.current.index ||
        newSelection.length !== selectionCache.current.length
      ) {
        console.debug(
          "setting selection range (old, new)",
          selectionCache.current,
          newSelection
        );
        selectionCache.current = newSelection;
        setSelection(newSelection);
      }
    }, 500);
    return () => {
      clearInterval(cancel);
    };
  }, [selectionRef, selectionCache]);

  // Selection
  useEffect(() => {
    let newTagIDs = computeTagIDsInSelection(selection);
    setTagIDsInSelection(newTagIDs);
  }, [selection, computeTagIDsInSelection]);

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
      highlightsCache.current = newHighlights;
      setHighlights(newHighlights);
    });
  }, [highlightsRef, highlightsCache]);

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

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    if (
      !highlightsRef ||
      !highlightDocument.ID ||
      !oauthClaims.email ||
      !highlightsCache
    ) {
      console.debug(
        "bailing",
        highlightsRef,
        highlightDocument.ID,
        oauthClaims.email,
        highlightsCache
      );
      return;
    }
    console.debug(
      "not bailing",
      highlightsRef,
      highlightDocument.ID,
      oauthClaims.email,
      highlightsCache
    );

    // This function sends any new highlights to the database.
    const syncHighlightsCreate = () => {
      if (!quillRef || !quillRef.current || !highlightsCache.current) {
        return;
      }
      let editorHighlightIDs = getHighlightIDsFromEditor();
      editorHighlightIDs.forEach((highlightID) => {
        if (!highlightsCache.current.hasOwnProperty(highlightID)) {
          let current = getHighlightFromEditor(highlightID);
          if (!current) return;

          let newHighlight = {
            ID: highlightID,
            organizationID: orgID,
            documentID: highlightDocument.ID,
            tagID: current.tagID,
            personID: highlightDocument.personID || "",
            selection: {
              index: current.selection.index,
              length: current.selection.length,
            },
            text: current.text,
            createdBy: oauthClaims.email,
            creationTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
            deletionTimestamp: highlightDocument.deletionTimestamp,
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
      if (!quillRef || !quillRef.current || !highlightsCache.current) {
        return;
      }
      // Update or delete highlights based on local edits.
      Object.values(highlightsCache.current).forEach((h) => {
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
              personID: highlightDocument.personID || "",
              selection: {
                index: current.selection.index,
                length: current.selection.length,
              },
              text: current.text,
              deletionTimestamp: highlightDocument.deletionTimestamp,
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
    highlightsCache,
    orgID,
    getHighlightFromEditor,
    highlightDocument.ID,
    highlightDocument.deletionTimestamp,
    highlightDocument.personID,
    quillRef,
    firebase,
  ]);

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = useCallback(
    (tag, checked) => {
      console.debug("onTagControlChange", tag, checked, selection);
      if (!quillRef || !quillRef.current) {
        return;
      }
      let editor = quillRef.current.getEditor();

      if (selection === undefined) {
        return;
      }

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
      setSelection(newRange);
      setTagIDsInSelection(computeTagIDsInSelection(newRange));
    },
    [
      quillRef,
      selection,
      computeHighlightsInSelection,
      computeTagIDsInSelection,
    ]
  );

  if (!highlights || !tags || !toolbarHeight) {
    return <></>;
  }

  return (
    <>
      <SelectionFAB
        toolbarHeight={toolbarHeight}
        selection={selection}
        tags={tags}
        tagIDsInSelection={tagIDsInSelection}
        onTagControlChange={onTagControlChange}
      />
      <HighlightHints
        toolbarHeight={toolbarHeight}
        highlights={highlights}
        tags={tags}
      />
    </>
  );
}
