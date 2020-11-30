import React, { useEffect, useRef, useState } from "react";
import { addTagStyles, removeTagStyles } from "../editor/Tags.js";
import { useNavigate, useParams } from "react-router-dom";

import CallDetails from "./CallDetails.js";
import Collaborators from "../util/Collaborators.js";
import ContentEditable from "react-contenteditable";
import DocumentDeleteDialog from "./DocumentDeleteDialog.js";
import DocumentDeleteTranscriptDialog from "./DocumentDeleteTranscriptDialog.js";
import DocumentDeleted from "./DocumentDeleted.js";
import DocumentSidebar from "./DocumentSidebar.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { Loading } from "../util/Utils.js";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Moment from "react-moment";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Notes from "./notes/Notes.js";
import Paper from "@material-ui/core/Paper";
import Scrollable from "../shell/Scrollable.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Transcript from "./transcript/Transcript.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  documentPaper: {
    margin: "0 1rem 0 2rem",
    padding: "1rem 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
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
  const [openTranscriptDeleteDialog, setOpenTranscriptDeleteDialog] = useState(
    false
  );

  const transcriptSelectionChan = new MessageChannel();
  const transcriptSelectionSend = transcriptSelectionChan.port1;
  const transcriptSelectionReceive = transcriptSelectionChan.port2;

  const [tagGroupName, setTagGroupName] = useState();

  const [anchorEl, setAnchorEl] = useState(null);

  const classes = useStyles();

  const handleOptionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionsClose = () => {
    setAnchorEl(null);
  };

  const handleTabChange = (e, newValue) => {
    let tab = "";
    if (newValue === 0) {
      tab = "transcript";
    }
    if (newValue === 1) {
      tab = "notes";
    }
    navigate(`/orgs/${orgID}/interviews/${documentID}/${tab}`);
  };

  const reactQuillTranscriptRef = useRef();
  const reactQuillNotesRef = useRef();

  useEffect(() => {
    if (!tabID) {
      setSelectedTab(0);
      return;
    }

    if (tabID === "transcript") {
      setSelectedTab(0);
    }

    if (tabID === "notes") {
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

  let createdAt;
  if (document.creationTimestamp && document.createdBy) {
    createdAt = (
      <Typography
        variant="body2"
        color="textSecondary"
        component="p"
        className={classes.detailsParagraph}
      >
        Created <Moment fromNow date={document.creationTimestamp.toDate()} /> by{" "}
        {document.createdBy}
      </Typography>
    );
  }

  return (
    <Grid
      container
      item
      md={12}
      lg={9}
      xl={10}
      spacing={0}
      style={{ backgroundColor: "white" }}
    >
      <Grid
        style={{ position: "relative", height: "100%" }}
        container
        item
        sm={12}
        md={8}
        xl={9}
      >
        <Scrollable id="editorScrollContainer">
          <Grid container item spacing={0} xs={12} style={{ height: "100%" }}>
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

                              documentRef.update({ name: newName });
                            }
                          }}
                        />
                      </Typography>
                      {createdAt}
                    </Grid>

                    <Grid item xs={1}>
                      <>
                        <IconButton
                          id="document-options"
                          edge="end"
                          aria-label="document options"
                          aria-haspopup="true"
                          aria-controls="document-menu"
                          onClick={handleOptionsClick}
                          color="inherit"
                        >
                          <MoreVertIcon />
                        </IconButton>
                        <Menu
                          id="profile-menu"
                          anchorEl={anchorEl}
                          keepMounted
                          open={Boolean(anchorEl)}
                          onClose={handleOptionsClose}
                        >
                          <MenuItem
                            id="archive-document-button"
                            onClick={() => {
                              setAnchorEl(null);
                              setOpenDeleteDialog(true);
                            }}
                          >
                            Archive
                          </MenuItem>
                          <MenuItem
                            disabled={!document.transcription}
                            onClick={() => {
                              setAnchorEl(null);
                              setOpenTranscriptDeleteDialog(true);
                            }}
                          >
                            Delete transcript
                          </MenuItem>
                        </Menu>
                      </>
                      <Collaborators dbRef={documentRef} />
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <CallDetails
                      document={document}
                      isDisabled={(call) => {
                        return !!(
                          document.transcription || call.callEndedTimestamp
                        );
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} className={classes.tabsContainer}>
                    <Tabs
                      value={selectedTab}
                      onChange={handleTabChange}
                      indicatorColor="secondary"
                      textColor="primary"
                      variant="fullWidth"
                      aria-label="full width"
                      className={classes.tabs}
                    >
                      <Tab
                        label="transcript"
                        id="transcript"
                        aria-controls="tabpanel-transcript"
                      />
                      <Tab
                        label="notes"
                        id="notes"
                        aria-controls="tabpanel-notes"
                      />
                    </Tabs>
                  </Grid>
                  {selectedTab === 0 && (
                    <Transcript
                      document={document}
                      tags={tags}
                      reactQuillRef={reactQuillTranscriptRef}
                      selectionChannelPort={transcriptSelectionSend}
                    />
                  )}

                  {selectedTab === 1 && (
                    <Notes
                      document={document}
                      tags={tags}
                      reactQuillRef={reactQuillNotesRef}
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
          reactQuillRef={reactQuillTranscriptRef}
          document={document}
          selectionChannelPort={transcriptSelectionReceive}
          tagGroupName={tagGroupName}
        />
      </Hidden>

      <DocumentDeleteDialog
        open={openDeleteDialog}
        setOpen={setOpenDeleteDialog}
        document={document}
      />

      <DocumentDeleteTranscriptDialog
        open={openTranscriptDeleteDialog}
        setOpen={setOpenTranscriptDeleteDialog}
        document={document}
      />
    </Grid>
  );
}
