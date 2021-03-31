// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import HighlightBlot from "./HighlightBlot.js";
import HighlightHints from "./HighlightHints.js";
import SelectionFAB from "./SelectionFAB.js";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { useQuery } from "../util/Query.js";
import event from "../analytics/event.js";
import * as firebaseClient from "firebase/app";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import Quill from "quill";

Quill.register("formats/highlight", HighlightBlot);

// Synchronize every second (1000ms).
const syncPeriod = 1000;

export default function HighlightControls({
  quillRef,
  initialScrollRef,
  selectionChannelPort,
  readyChannelPort,
  highlightsRef,
  highlightDocument,
  tags,
}) {
  const firebase = useContext(FirebaseContext);
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const [toolbarHeight, setToolbarHeight] = useState(40);
  const [editorReadyReceived, setEditorReadyReceived] = useState(false);
  const [selection, setSelection] = useState();
  const [highlights, setHighlights] = useState();
  const highlightsCache = useRef();
  const [scrollHighlightID, setScrollHighlightID] = useState();
  const [tagIDsInSelection, setTagIDsInSelection] = useState(new Set());

  const query = useQuery();

  readyChannelPort.onmessage = () => {
    setEditorReadyReceived(true);
  };

  const getEditor = useCallback(() => {
    return quillRef.current && quillRef.current.getEditor();
  }, [quillRef]);

  // Reset scroll flag on navigate
  useEffect(() => {
    let highlightID = query.get("quote");
    setScrollHighlightID(highlightID);
  }, [query]);

  // Scroll to quote ID from URL on load.
  useEffect(() => {
    if (
      initialScrollRef.current ||
      !scrollHighlightID ||
      !editorReadyReceived ||
      !highlights ||
      !highlights[scrollHighlightID]
    ) {
      return;
    }

    let editor = getEditor();
    if (!editor) {
      console.debug("useEffect (scroll): editor not available");
      return;
    }

    let highlight = highlights[scrollHighlightID];

    let highlightNode = document.getElementsByClassName(
      `highlight-${scrollHighlightID}`
    )[0];

    const scrollToHighlightNode = () => {
      console.debug("scrolling to highlight node", highlightNode);
      editor.setSelection(highlight.selection.index, "user");
      highlightNode.scrollIntoView({ behavior: "smooth", block: "center" });
      initialScrollRef.current = true;
    };

    if (document.body.contains(highlightNode)) {
      scrollToHighlightNode();
    }
  }, [
    getEditor,
    editorReadyReceived,
    scrollHighlightID,
    highlights,
    initialScrollRef,
  ]);

  const getHighlightFromEditor = useCallback(
    (highlightID) => {
      let editor = getEditor();
      if (!editor) {
        console.debug("getHighlightFromEditor: editor not available");
        return;
      }

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
    [getEditor]
  );

  // selection: a range object with fields 'index' and 'length'
  const computeHighlightsInSelection = useCallback(
    (selection) => {
      let editor = getEditor();
      if (!editor) {
        console.debug("computeHighlightsInSelection: editor not available");
        return [];
      }

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
    [getEditor, getHighlightFromEditor]
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

  selectionChannelPort.onmessage = (msg) => {
    setSelection(msg.data);
  };

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
    return highlightsRef.orderBy("deletionTimestamp").onSnapshot((snapshot) => {
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
      return;
    }

    // This function sends any new highlights to the database.
    const syncHighlightsCreate = () => {
      let editor = getEditor();
      if (!editor) {
        console.debug("syncHighlightsCreate: editor not available");
        return;
      }
      if (!highlightsCache.current) {
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
            indexRequestedTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
          };
          console.debug(
            "syncHighlightsCreate: creating highlight",
            newHighlight
          );
          event(firebase, "create_highlight", {
            orgID: orgID,
            userID: oauthClaims.user_id,
          });

          highlightsRef.doc(highlightID).set(newHighlight);
        }
      });
    };

    // This function sends any local updates to highlight content relative
    // to the local editor to the database.
    const syncHighlightsUpdate = () => {
      let editor = getEditor();
      if (!editor) {
        console.debug("syncHighlightsUpdate: editor not available");
        return;
      }
      if (!highlightsCache.current) {
        return;
      }
      // Update or delete highlights based on local edits.
      Object.values(highlightsCache.current).forEach((h) => {
        let current = getHighlightFromEditor(h.ID);

        if (current === undefined) {
          // highlight is not present; delete it in the database.
          console.debug("syncHighlightsUpdate: deleting highlight", h);

          event(firebase, "delete_highlight", {
            orgID: orgID,
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
          highlightsRef.doc(h.ID).update({
            personID: highlightDocument.personID || "",
            selection: {
              index: current.selection.index,
              length: current.selection.length,
            },
            text: current.text,
            lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
          });
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
    getEditor,
    firebase,
  ]);

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = useCallback(
    (tag, checked) => {
      console.debug("onTagControlChange", tag, checked, selection);

      let editor = getEditor();
      if (!editor) {
        console.debug("onTagControlChange: editor not available");
        return;
      }

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
      getEditor,
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
