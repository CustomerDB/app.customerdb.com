import React, { useCallback, useEffect, useState } from "react";
import { addTagStyles, removeTagStyles } from "./Tags.js";
import { useNavigate, useParams } from "react-router-dom";

import Archive from "@material-ui/icons/Archive";
import Collaborators from "../util/Collaborators.js";
import ContentEditable from "react-contenteditable";
import DocumentDeleteDialog from "./DocumentDeleteDialog.js";
import DocumentDeleted from "./DocumentDeleted.js";
import DocumentSidebar from "./DocumentSidebar.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Notes from "./Notes.js";
import Paper from "@material-ui/core/Paper";
import Scrollable from "../shell/Scrollable.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Transcript from "./Transcript.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  documentPaper: {
    margin: "1rem 1rem 1rem 2rem",
    padding: "1rem 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
  },
  tabs: {
    width: "100%",
  },
  tabsContainer: {
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
    height: "3rem",
    width: "100%",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
});

export default function Document(props) {
  const { tagGroupsRef, documentRef } = useFirestore();

  const { orgID, documentID, tabID } = useParams();

  const navigate = useNavigate();
  const [document, setDocument] = useState();
  const [tags, setTags] = useState();

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState();

  const [
    currentTranscriptSelection,
    setCurrentTranscriptSelection,
  ] = useState();
  const [tagGroupName, setTagGroupName] = useState();

  const classes = useStyles();

  const handleTabChange = (e, newValue) => {
    let tab = "";
    if (newValue === 0) {
      tab = "notes";
    }
    if (newValue === 1) {
      tab = "transcript";
    }
    navigate(`/orgs/${orgID}/interviews/${documentID}/${tab}`);
  };

  const [transcriptEditor, seTranscriptEditor] = useState();
  const reactQuillTranscriptRef = useCallback(
    (current) => {
      if (!current) {
        seTranscriptEditor();
        return;
      }
      seTranscriptEditor(current.getEditor());
    },
    [seTranscriptEditor]
  );

  useEffect(() => {
    if (!tabID) {
      setSelectedTab(0);
      return;
    }

    if (tabID === "notes") {
      setSelectedTab(0);
    }

    if (tabID === "transcript") {
      setSelectedTab(1);
    }
  }, [tabID]);

  // Subscribe to document name changes
  useEffect(() => {
    if (!documentRef) {
      return;
    }

    return documentRef.onSnapshot((doc) => {
      console.debug("received document snapshot");
      if (!doc.exists) {
        navigate("/404");
        return;
      }

      let data = doc.data();
      data.ID = doc.id;
      setDocument(data);
    });
  }, [navigate, documentRef]);

  // Subscribe to tags for the document's tag group.
  useEffect(() => {
    if (!tagGroupsRef || !document) {
      return;
    }

    if (!document.tagGroupID) {
      setTagGroupName();
      setTags();
      removeTagStyles();
      return;
    }

    let tagGroupRef = tagGroupsRef.doc(document.tagGroupID);

    let unsubscribeTagGroup = tagGroupRef.onSnapshot((doc) => {
      let tagGroupData = doc.data();
      setTagGroupName(tagGroupData.name);
    });

    let unsubscribeTags = tagGroupsRef
      .doc(document.tagGroupID)
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
  }, [document, tagGroupsRef]);

  if (!document) {
    return <Loading />;
  }

  if (document.deletionTimestamp !== "") {
    return (
      <div>
        <DocumentDeleted document={document} />
      </div>
    );
  }

  return (
    <Grid container item md={12} lg={9} xl={10} spacing={0}>
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
                          html={document.name}
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
                          date={document.creationTimestamp.toDate()}
                        />{" "}
                        by {document.createdBy}
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

                  <Grid item xs={12} class={classes.tabsContainer}>
                    <Tabs
                      value={selectedTab}
                      onChange={handleTabChange}
                      indicatorColor="secondary"
                      textColor="primary"
                      variant="fullWidth"
                      aria-label="full width"
                      class={classes.tabs}
                    >
                      <Tab
                        label="notes"
                        id="notes"
                        aria-controls="tabpanel-notes"
                      />
                      <Tab
                        label="transcript"
                        id="transcript"
                        aria-controls="tabpanel-transcript"
                      />
                    </Tabs>
                  </Grid>

                  {selectedTab === 0 && (
                    <Notes
                      document={document}
                      tags={tags}
                      reactQuillRef={props.reactQuillNotesRef}
                    />
                  )}

                  {selectedTab === 1 && (
                    <Transcript
                      document={document}
                      tags={tags}
                      reactQuillRef={reactQuillTranscriptRef}
                      currentSelection={currentTranscriptSelection}
                      setCurrentSelectionCallback={
                        setCurrentTranscriptSelection
                      }
                      editor={transcriptEditor}
                    />
                  )}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>

      <Hidden smDown>
        <DocumentSidebar
          transcriptEditor={transcriptEditor}
          document={document}
          selection={currentTranscriptSelection}
          tagGroupName={tagGroupName}
        />
      </Hidden>

      <DocumentDeleteDialog
        open={openDeleteDialog}
        setOpen={setOpenDeleteDialog}
        document={document}
      />
    </Grid>
  );
}
