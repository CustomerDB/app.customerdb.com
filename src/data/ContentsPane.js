import "react-quill/dist/quill.snow.css";

import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { addTagStyles, removeTagStyles } from "./Tags.js";

import Archive from "@material-ui/icons/Archive";
import Collaborators from "../util/Collaborators.js";
import ContentEditable from "react-contenteditable";
import Delta from "quill-delta";
import DocumentDeleteDialog from "./DocumentDeleteDialog.js";
import DocumentSidebar from "./DocumentSidebar.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import HighlightBlot from "./HighlightBlot.js";
import HighlightHints from "./HighlightHints.js";
import IconButton from "@material-ui/core/IconButton";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import Quill from "quill";
import ReactQuill from "react-quill";
import Scrollable from "../shell/Scrollable.js";
import SelectionFAB from "./SelectionFAB.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { initialDelta } from "./delta.js";
import { makeStyles } from "@material-ui/core/styles";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

Quill.register("formats/highlight", HighlightBlot);

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
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const {
    tagGroupsRef,
    documentRef,
    revisionsRef,
    highlightsRef,
    deltasRef,
  } = useFirestore();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const [editorID] = useState(nanoid());
  const [revisionDelta, setRevisionDelta] = useState();
  const [revisionTimestamp, setRevisionTimestamp] = useState();
  const [tagGroupName, setTagGroupName] = useState();
  const [tags, setTags] = useState();
  const [reflowHints, setReflowHints] = useState(nanoid());
  const [toolbarHeight, setToolbarHeight] = useState(40);

  const [tagIDsInSelection, setTagIDsInSelection] = useState(new Set());

  const localDelta = useRef(new Delta([]));
  const latestDeltaTimestamp = useRef();

  const currentSelection = useRef();
  const quillContainerRef = useRef();

  const highlights = useRef();

  const classes = useStyles();

  const updateHints = () => {
    setReflowHints(nanoid());
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
      let domNode = document.getElementById(`highlight-${highlightID}`);

      if (!domNode) return undefined;

      let tagID = domNode.dataset.tagID;
      let blot = Quill.find(domNode, false);

      if (!blot) return undefined;

      let index = props.editor.getIndex(blot);
      let length = blot.length();
      let text = props.editor.getText(index, length);

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

  // onEdit builds a batch of local edits in `localDelta`
  // which are sent to the server and reset to [] periodically
  // in `syncDeltas()`.
  const onEdit = (content, delta, source, editor) => {
    updateHints();

    if (source !== "user") {
      // console.debug("onEdit: skipping non-user change", delta, source);
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

  // onTagControlChange is invoked when the user checks or unchecks one of the
  // tag input elements.
  const onTagControlChange = (tag, checked) => {
    console.debug("onTagControlChange", tag, checked, currentSelection);

    if (currentSelection.current === undefined) {
      return;
    }

    let selection = currentSelection.current;

    if (checked) {
      console.debug("formatting highlight with tag ", tag);

      let highlightID = nanoid();

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
    currentSelection.current = newRange;
    setTagIDsInSelection(computeTagIDsInSelection(newRange));
  };

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

  // Subscribe to the latest revision
  useEffect(() => {
    if (!revisionsRef) {
      return;
    }

    return revisionsRef
      .orderBy("timestamp", "desc")
      .limit(1)
      .onSnapshot((snapshot) => {
        console.log("revision snapshot received", snapshot);

        if (snapshot.size === 0) {
          console.log("snapshot.size is 0");

          setRevisionDelta(initialDelta());
          setRevisionTimestamp(window.firebase.firestore.Timestamp(0, 0));
          return;
        }

        // hint: limit 1 -- iterating over a list of exactly 1
        snapshot.forEach((doc) => {
          let data = doc.data();

          console.log("snapshot.data()", data);

          setRevisionDelta(new Delta(data.delta.ops));
          console.log("found data timestamp", data.timestamp);
          if (!data.timestamp) {
            setRevisionTimestamp(window.firebase.firestore.Timestamp(0, 0));
            return;
          }
          setRevisionTimestamp(data.timestamp);
        });
      });
  }, [revisionsRef]);

  // Document will contain the latest cached and compressed version of the delta document.
  // Subscribe to deltas from other remote clients.
  useEffect(() => {
    console.log("deltas useEffect", {
      editorID: editorID,
      editor: props.editor,
      deltasRef: deltasRef,
      revisionTimestamp: revisionTimestamp,
    });
    if (!editorID || !props.editor || !deltasRef || !revisionTimestamp) {
      return;
    }

    if (!latestDeltaTimestamp.current) {
      latestDeltaTimestamp.current = revisionTimestamp;
    }

    console.log("latestDeltaTimestamp.current", latestDeltaTimestamp.current);

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

        let selection = props.editor.getSelection();
        let selectionIndex = selection ? selection.index : 0;

        // Compute inverse of local delta.
        let editorContents = props.editor.getContents();
        console.debug("editorContents", editorContents);

        console.debug("localDelta (before)", localDelta.current);
        let inverseLocalDelta = localDelta.current.invert(editorContents);
        console.debug("inverseLocalDelta", inverseLocalDelta);

        // Undo local edits
        console.debug("unapplying local delta");
        props.editor.updateContents(inverseLocalDelta);
        selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);

        newDeltas.forEach((delta) => {
          props.editor.updateContents(delta);
          selectionIndex = delta.transformPosition(selectionIndex);

          console.debug("transform local delta");
          const serverFirst = true;
          localDelta.current = delta.transform(localDelta.current, serverFirst);
        });

        // Reapply local edits
        console.debug("applying transformed local delta", localDelta.current);
        props.editor.updateContents(localDelta.current);
        selectionIndex = localDelta.current.transformPosition(selectionIndex);

        if (selection) {
          console.debug("updating selection index");
          props.editor.setSelection(selectionIndex, selection.length);
        }
      });
  }, [editorID, props.editor, revisionTimestamp, deltasRef]);

  // Register timers to periodically sync local changes with firestore.
  useEffect(() => {
    if (
      !highlightsRef ||
      !deltasRef ||
      !props.document.ID ||
      !oauthClaims.email
    ) {
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

    // This function sends any local updates to highlight content relative
    // to the local editor to the database.
    const syncHighlights = () => {
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
          console.debug("syncHighlights: deleting highlight", h);

          event("delete_highlight", {
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
          console.debug("syncHighlights: updating highlight", h, current);

          // upload diff
          highlightsRef.doc(h.ID).set(
            {
              tagID: current.tagID,
              personID: props.document.personID,
              selection: {
                index: current.selection.index,
                length: current.selection.length,
              },
              text: current.text,
              deletionTimestamp: props.document.deletionTimestamp,
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
            personID: props.document.personID,
            selection: {
              index: current.selection.index,
              length: current.selection.length,
            },
            text: current.text,
            createdBy: oauthClaims.email,
            creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            deletionTimestamp: props.document.deletionTimestamp,
            lastUpdateTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          };

          console.debug("syncHighlights: creating highlight", newHighlight);

          event("create_highlight", {
            orgID: oauthClaims.orgID,
            userID: oauthClaims.user_id,
          });

          highlightsRef.doc(highlightID).set(newHighlight);

          updateHints();
        }
      });
    };

    console.debug(`starting periodic syncDeltas every ${syncPeriod}ms`);
    let syncDeltaInterval = setInterval(syncDeltas, syncPeriod);

    console.debug(`starting periodic syncHighlights every ${syncPeriod}ms`);
    let syncHighlightsInterval = setInterval(syncHighlights, syncPeriod);
    return () => {
      clearInterval(syncDeltaInterval);
      clearInterval(syncHighlightsInterval);
    };
  }, [
    oauthClaims,
    deltasRef,
    editorID,
    highlightsRef,
    orgID,
    getHighlightFromEditor,
    props.document.ID,
    props.document.deletionTimestamp,
    props.document.personID,
    props.editor,
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

  if (!revisionDelta) {
    return <></>;
  }

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
                      <Typography gutterBottom variant="h4" component="h2">
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

                  <Grid
                    ref={quillContainerRef}
                    item
                    xs={12}
                    style={{ position: "relative" }}
                    spacing={0}
                  >
                    <ReactQuill
                      id="quill-editor"
                      ref={props.reactQuillRef}
                      defaultValue={revisionDelta}
                      theme="snow"
                      placeholder="Start typing here and select to mark highlights"
                      onChange={onEdit}
                      onChangeSelection={onSelect}
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
                      selection={currentSelection.current}
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
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>

      <Hidden smDown>
        <DocumentSidebar
          document={props.document}
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
