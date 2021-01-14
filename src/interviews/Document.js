import React, { useContext, useEffect, useRef, useState } from "react";
import { addTagStyles, removeTagStyles } from "../editor/Tags.js";
import { useOrgTags } from "../organization/hooks.js";
import { useNavigate, useParams } from "react-router-dom";

import UserAuthContext from "../auth/UserAuthContext";
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
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import FlashOnRoundedIcon from "@material-ui/icons/FlashOnRounded";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import ArchiveIcon from "@material-ui/icons/Archive";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import CloseIcon from "@material-ui/icons/Close";
import Notes from "./notes/Notes.js";
import Paper from "@material-ui/core/Paper";
import Scrollable from "../shell/Scrollable.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Transcript from "./transcript/Transcript.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import Tooltip from "@material-ui/core/Tooltip";
import domToPdf from "dom-to-pdf";

const useStyles = makeStyles({
  documentPaper: {
    margin: "0 1rem 0 2rem",
    padding: "0 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
  },
  tabs: {
    width: "100%",
    height: "2rem",
  },
  tabsContainer: {
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
    height: "10rem",
    width: "100%",
    overflow: "hidden",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
});

export default function Document(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { documentRef } = useFirestore();
  const authorName = oauthClaims.name;
  const authorID = oauthClaims.user_id;
  const { orgID, documentID, tabID } = useParams();

  const navigate = useNavigate();
  const [document, setDocument] = useState();
  const [tags, setTags] = useState();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

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

  const [hasSuggestions, setHasSuggestions] = useState(false);

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

  // All organization tags
  const orgTags = useOrgTags();

  // React to changes in the document's tag group.
  useEffect(() => {
    if (!orgTags || !document) {
      return;
    }

    if (!document.tagGroupID) {
      setTagGroupName();
      setTags();
      removeTagStyles();
      return;
    }

    const docTagGroup = orgTags[document.tagGroupID];

    if (docTagGroup) {
      setTagGroupName(docTagGroup.name);
      setTags(docTagGroup.tags);
      addTagStyles(docTagGroup.tags);
    }

    return removeTagStyles;
  }, [document, orgTags]);

  useEffect(() => {
    if (!documentRef) {
      return;
    }
  }, [documentRef]);

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

  const downloadDocument = () => {
    const element = window.document.getElementById("interviewPaper");
    if (!element) return;
    const options = {
      filename: document.name,
      excludeClassNames: ["noPrint", "ql-toolbar", "ql-cursors"],
      overrideWidth: 800,
    };
    domToPdf(element, options, () => {
      console.debug("download complete");
    });
  };

  return (
    <Grid
      container
      item
      xs={12}
      spacing={0}
      style={{ backgroundColor: "white", position: "absolute", height: "100%" }}
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
              <Paper
                id="interviewPaper"
                className={classes.documentPaper}
                elevation={0}
              >
                <Grid
                  container
                  item
                  xs={12}
                  alignItems="center"
                  className={classes.tabsContainer}
                >
                  <Grid item xs={7} sm={5}>
                    <Typography
                      gutterBottom
                      variant="h6"
                      style={{ fontWeight: "bold" }}
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
                  </Grid>

                  <Hidden xsDown>
                    <Grid className="noPrint" container item xs={2}>
                      <Collaborators dbRef={documentRef} />
                    </Grid>
                  </Hidden>

                  <Grid
                    className="noPrint"
                    container
                    item
                    xs={5}
                    justify="flex-end"
                  >
                    <>
                      <Tooltip title="Suggest highlights">
                        <IconButton
                          disabled={!hasSuggestions}
                          onClick={() => {
                            setAnchorEl(null);
                            setSuggestionsOpen(true);
                          }}
                        >
                          <FlashOnRoundedIcon
                            style={
                              hasSuggestions
                                ? { color: "#fcba03" }
                                : { color: "grey" }
                            }
                          />
                        </IconButton>
                      </Tooltip>
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
                          id="download-document-button"
                          onClick={() => {
                            downloadDocument();
                            setAnchorEl(null);
                          }}
                        >
                          <ListItemIcon>
                            <CloudDownloadIcon />
                          </ListItemIcon>
                          Download PDF
                        </MenuItem>
                        <MenuItem
                          id="archive-document-button"
                          onClick={() => {
                            setAnchorEl(null);
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <ListItemIcon>
                            <ArchiveIcon />
                          </ListItemIcon>
                          Archive
                        </MenuItem>
                        <MenuItem
                          disabled={!document.transcription}
                          onClick={() => {
                            setAnchorEl(null);
                            setOpenTranscriptDeleteDialog(true);
                          }}
                        >
                          <ListItemIcon>
                            <DeleteSweepIcon />
                          </ListItemIcon>
                          Delete transcript
                        </MenuItem>
                      </Menu>
                      <IconButton
                        onClick={() => {
                          // TODO: Communicate with parent component instead of using navigate.
                          navigate(`/orgs/${orgID}/interviews`);
                        }}
                        color="inherit"
                      >
                        <CloseIcon />
                      </IconButton>
                    </>
                  </Grid>

                  <Tabs
                    value={selectedTab}
                    onChange={handleTabChange}
                    indicatorColor="secondary"
                    textColor="primary"
                    variant="fullWidth"
                    aria-label="full width"
                    className={`${classes.tabs} noPrint`}
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
                    authorID={authorID}
                    authorName={authorName}
                    document={document}
                    tags={tags}
                    reactQuillRef={reactQuillTranscriptRef}
                    cursorsRef={documentRef.collection("transcriptCursors")}
                    selectionChannelPort={transcriptSelectionSend}
                    suggestionsOpen={suggestionsOpen}
                    setSuggestionsOpen={setSuggestionsOpen}
                    setHasSuggestions={setHasSuggestions}
                  />
                )}

                {selectedTab === 1 && (
                  <Notes
                    authorID={authorID}
                    authorName={authorName}
                    document={document}
                    tags={tags}
                    reactQuillRef={reactQuillNotesRef}
                    suggestionsOpen={suggestionsOpen}
                    setSuggestionsOpen={setSuggestionsOpen}
                    setHasSuggestions={setHasSuggestions}
                  />
                )}
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
