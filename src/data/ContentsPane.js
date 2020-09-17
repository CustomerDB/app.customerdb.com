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
import { addTagStyles, removeTagStyles } from "./Tags.js";

import Archive from "@material-ui/icons/Archive";
import CollabEditor from "../editor/CollabEditor.js";
import Collaborators from "../util/Collaborators.js";
import ContentEditable from "react-contenteditable";
import Delta from "quill-delta";
import DocumentDeleteDialog from "./DocumentDeleteDialog.js";
import DocumentSidebar from "./DocumentSidebar.js";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import HighlightBlot from "./HighlightBlot.js";
import HighlightHints from "./HighlightHints.js";
import IconButton from "@material-ui/core/IconButton";
import LinearProgress from "@material-ui/core/LinearProgress";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import PlayheadBlot from "./PlayheadBlot.js";
import Quill from "quill";
import Scrollable from "../shell/Scrollable.js";
import SelectionFAB from "./SelectionFAB.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

Quill.register("formats/highlight", HighlightBlot);
Quill.register("formats/playhead", PlayheadBlot);

// Synchronize every second (1000ms).
const syncPeriod = 1000;

const useStyles = makeStyles({
  documentPaper: {
    margin: "1rem 1rem 1rem 2rem",
    padding: "1rem 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
});

// ContentsPane augments a collaborative editor with tags and text highlights.
export default function ContentsPane(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const {
    tagGroupsRef,
    documentRef,
    highlightsRef,
    transcriptionsRef,
  } = useFirestore();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [tagGroupName, setTagGroupName] = useState();
  const [tags, setTags] = useState();
  const [reflowHints, setReflowHints] = useState(uuidv4());
  const [toolbarHeight, setToolbarHeight] = useState(40);
  const [transcriptionProgress, setTranscriptionProgress] = useState();

  const [tagIDsInSelection, setTagIDsInSelection] = useState(new Set());

  const [currentSelection, setCurrentSelection] = useState();
  const quillContainerRef = useRef();

  const highlights = useRef();

  const classes = useStyles();

  const updateHints = () => {
    setReflowHints(uuidv4());
  };

  // Subscribe to window resize events because hint offsets need to be
  // recomputed if the browser zoom level changes.
  useEffect(() => {
    const onResize = () => {
      let editorNode = document.getElementById("quill-editor");
      if (editorNode) {
        let toolbarNodes = editorNode.getElementsByClassName("ql-toolbar");
        if (toolbarNodes.length > 0) {
          let rects = toolbarNodes[0].getClientRects();
          if (rects.length > 0) {
            setToolbarHeight(Math.round(rects[0].height));
          }
        }
      }
      updateHints();
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
    let selectionDelta = props.editor.getContents(selection.index, length);
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

        let blotIndex = props.editor.getIndex(blot);
        index = Math.min(index, blotIndex);
        end = Math.max(end, blotIndex + blot.length());
        textSegments.push(props.editor.getText(blotIndex, blot.length()));
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
    [props.editor]
  );

  const onChange = (content, delta, source, editor) => {
    updateHints();
  };

  // onChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const onChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }

    console.debug("current selection range", range);
    setCurrentSelection(range);
    setTagIDsInSelection(computeTagIDsInSelection(range));
  };

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = (tag, checked) => {
    console.debug("onTagControlChange", tag, checked, currentSelection);

    if (currentSelection === undefined) {
      return;
    }

    let selection = currentSelection;

    if (checked) {
      console.debug("formatting highlight with tag ", tag);

      let highlightID = uuidv4();

      props.editor.formatText(
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

        props.editor.formatText(
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
    props.editor.setSelection(newRange, "user");
    setCurrentSelection(newRange);
    setTagIDsInSelection(computeTagIDsInSelection(newRange));
  };

  useEffect(() => {
    if (
      !transcriptionsRef ||
      !props.document.pending ||
      !props.document.transcription
    ) {
      return;
    }

    return transcriptionsRef
      .doc(props.document.transcription)
      .onSnapshot((doc) => {
        let operation = doc.data();
        console.debug("Transcript operation: ", operation);
        if (operation.progress) {
          setTranscriptionProgress(operation.progress);
        }
      });
  }, [props.document.pending, transcriptionsRef, props.document.transcription]);

  // Subscribe to tags for the document's tag group.
  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }
    if (!props.document.tagGroupID) {
      setTagGroupName();
      setTags();
      removeTagStyles();
      return;
    }

    let tagGroupRef = tagGroupsRef.doc(props.document.tagGroupID);

    let unsubscribeTagGroup = tagGroupRef.onSnapshot((doc) => {
      let tagGroupData = doc.data();
      setTagGroupName(tagGroupData.name);
    });

    let unsubscribeTags = tagGroupsRef
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
      unsubscribeTagGroup();
      unsubscribeTags();
    };
  }, [props.document.tagGroupID, tagGroupsRef]);

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    if (
      !highlightsRef ||
      !props.document.ID ||
      !oauthClaims.email ||
      props.document.pending
    ) {
      return;
    }

    // This function sends any new highlights to the database.
    const syncHighlightsCreate = () => {
      if (!props.editor) {
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

          updateHints();
        }
      });
    };

    // This function sends any local updates to highlight content relative
    // to the local editor to the database.
    const syncHighlightsUpdate = () => {
      if (!props.editor) {
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

          updateHints();
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
    props.editor,
    props.document.pending,
    firebase,
  ]);

  // Subscribe to highlight changes
  useEffect(() => {
    if (!highlightsRef) {
      return;
    }

    return highlightsRef.onSnapshot((snapshot) => {
      let newHighlights = {};

      let hintsNeedReflow = highlights.current === undefined;

      snapshot.forEach((highlightDoc) => {
        let data = highlightDoc.data();
        data["ID"] = highlightDoc.id;
        newHighlights[data.ID] = data;

        if (
          !hintsNeedReflow &&
          highlights.current &&
          !highlights.current[data.ID]
        ) {
          hintsNeedReflow = true;
        }
      });

      // console.debug("Received newHighlights ", newHighlights);

      highlights.current = newHighlights;

      if (hintsNeedReflow) {
        updateHints();
      }
    });
  }, [highlightsRef]);

  return (
    <>
      <Grid
        style={{ position: "relative", height: "100%" }}
        container
        item
        sm={12}
        md={8}
        xl={9}
      >
        <Scrollable>
          <Grid container item spacing={0} xs={12}>
            <Grid container item justify="center">
              <Paper elevation={5} className={classes.documentPaper}>
                <Grid container>
                  <Grid container item xs={12} alignItems="flex-start">
                    <Grid item xs={11}>
                      <Typography
                        gutterBottom
                        variant="h4"
                        component="h2"
                        id="documentTitle"
                      >
                        <ContentEditable
                          html={props.document.name}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                          onBlur={(e) => {
                            if (documentRef) {
                              let newName = e.target.innerText
                                .replace(/(\r\n|\n|\r)/gm, " ")
                                .replace(/\s+/g, " ")
                                .trim();

                              console.debug("setting document name", newName);

                              documentRef.set(
                                { name: newName },
                                { merge: true }
                              );
                            }
                          }}
                        />
                      </Typography>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        component="p"
                        className={classes.detailsParagraph}
                      >
                        Created{" "}
                        <Moment
                          fromNow
                          date={props.document.creationTimestamp.toDate()}
                        />{" "}
                        by {props.document.createdBy}
                      </Typography>
                    </Grid>

                    <Grid item xs={1}>
                      <IconButton
                        id="archive-document-button"
                        color="primary"
                        aria-label="Archive document"
                        onClick={() => {
                          console.debug("confirm archive doc");
                          setOpenDeleteDialog(true);
                        }}
                      >
                        <Archive />
                      </IconButton>
                      <Collaborators dbRef={documentRef} />
                    </Grid>
                  </Grid>

                  {props.document.pending ? (
                    <Grid item xs={12} style={{ position: "relative" }}>
                      <p>
                        <i>Transcribing video</i>
                      </p>
                      {transcriptionProgress ? (
                        <LinearProgress
                          variant="determinate"
                          value={transcriptionProgress}
                        />
                      ) : (
                        <LinearProgress />
                      )}
                    </Grid>
                  ) : (
                    <Grid
                      ref={quillContainerRef}
                      item
                      xs={12}
                      style={{ position: "relative" }}
                      spacing={0}
                    >
                      <CollabEditor
                        objectRef={documentRef}
                        quillRef={props.reactQuillRef}
                        editor={props.editor}
                        id="quill-editor"
                        theme="snow"
                        staticDeltas={
                          new Delta({ retain: 10, attributes: { bold: true } })
                        }
                        placeholder="Start typing here and select to mark highlights"
                        onChange={onChange}
                        onChangeSelection={onChangeSelection}
                        modules={{
                          toolbar: [
                            [{ header: [1, 2, false] }],
                            [
                              "bold",
                              "italic",
                              "underline",
                              "strike",
                              "blockquote",
                            ],
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
                        quillContainerRef={quillContainerRef}
                        tags={tags}
                        tagIDsInSelection={tagIDsInSelection}
                        onTagControlChange={onTagControlChange}
                      />

                      <HighlightHints
                        key={reflowHints}
                        toolbarHeight={toolbarHeight}
                        highlights={highlights.current}
                        tags={tags}
                      />
                    </Grid>
                  )}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>

      <Hidden smDown>
        <DocumentSidebar
          editor={props.editor}
          document={props.document}
          selection={currentSelection}
          tagGroupName={tagGroupName}
        />
      </Hidden>

      <DocumentDeleteDialog
        open={openDeleteDialog}
        setOpen={setOpenDeleteDialog}
        document={props.document}
      />
    </>
  );
}
