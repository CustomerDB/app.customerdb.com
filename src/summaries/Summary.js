import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Collaborators from "../util/Collaborators.js";
import ContentEditable from "react-contenteditable";
import SummaryDeleteDialog from "./SummaryDeleteDialog.js";
import SummaryDeleted from "./SummaryDeleted.js";
import SummarySidebar from "./SummarySidebar.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import { Loading } from "../util/Utils.js";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import ArchiveIcon from "@material-ui/icons/Archive";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import CloseIcon from "@material-ui/icons/Close";
import SummaryEditor from "./SummaryEditor.js";
import Paper from "@material-ui/core/Paper";
import Scrollable from "../shell/Scrollable.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import domToPdf from "dom-to-pdf";
import Sidepane from "../shell/Sidepane.js";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles({
  summaryPaper: {
    margin: "0 1rem 0 2rem",
    padding: "0 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
    backgroundColor: "#fff",
  },
  tabsContainer: {
    position: "sticky",
    top: 0,
    height: "6rem",
    width: "100%",
    overflow: "hidden",
    zIndex: 5,
    background: "#fff",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
});

export default function Summary(props) {
  // hooks
  const { summaryRef } = useFirestore();
  const { orgID } = useParams();
  const classes = useStyles();
  const navigate = useNavigate();

  // state
  const [summary, setSummary] = useState();
  const [sidepaneOpen, setSidepaneOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // refs
  const reactQuillSummaryRef = useRef();

  const handleOptionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionsClose = () => {
    setAnchorEl(null);
  };

  // Subscribe to summary name changes
  useEffect(() => {
    if (!summaryRef) {
      return;
    }

    return summaryRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }

      let data = doc.data();
      data.ID = doc.id;
      setSummary(data);
    });
  }, [navigate, summaryRef]);

  if (!summary) {
    return <Loading />;
  }

  if (summary.deletionTimestamp !== "") {
    return (
      <div>
        <SummaryDeleted summary={summary} />
      </div>
    );
  }

  const downloadSummary = () => {
    const element = document.getElementById("editorSummaryPaper");
    if (!element) return;
    const options = {
      filename: summary.name,
      excludeClassNames: ["noPrint", "ql-toolbar", "ql-cursors"],
      overrideWidth: 800,
    };
    domToPdf(element, options, () => {
      console.debug("download complete");
    });
  };

  return (
    <Grid
      id="summaryEditorContainer"
      container
      className="fullHeight"
      style={{ position: "relative" }}
    >
      <Grid
        container
        item
        xs={12}
        spacing={0}
        style={{
          backgroundColor: "white",
          position: "absolute",
          height: "100%",
        }}
      >
        <Grid
          style={{
            position: "relative",
            height: "100%",
            zIndex: 1,
          }}
          container
          item
        >
          <Scrollable id="editorScrollContainer">
            <Grid container item spacing={0} xs={12} style={{ height: "100%" }}>
              <Grid container item justify="center">
                <Paper
                  id="editorSummaryPaper"
                  className={classes.summaryPaper}
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
                        id="summary-title"
                      >
                        <ContentEditable
                          html={summary.name}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                          onBlur={(e) => {
                            if (summaryRef) {
                              let newName = e.target.innerText
                                .replace(/(\r\n|\n|\r)/gm, " ")
                                .replace(/\s+/g, " ")
                                .trim();

                              console.debug("setting summary name", newName);

                              summaryRef.update({ name: newName });
                            }
                          }}
                        />
                      </Typography>
                    </Grid>

                    <Hidden xsDown>
                      <Grid className="noPrint" container item xs={2}>
                        <Collaborators dbRef={summaryRef} />
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
                        <Button
                          startIcon={<BubbleChartIcon />}
                          onClick={() => {
                            setSidepaneOpen(true);
                          }}
                        >
                          Embed quotes and themes
                        </Button>
                        <IconButton
                          id="summary-options"
                          edge="end"
                          aria-label="summary options"
                          aria-haspopup="true"
                          aria-controls="summary-menu"
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
                            id="download-summary-button"
                            onClick={() => {
                              downloadSummary();
                              setAnchorEl(null);
                            }}
                          >
                            <ListItemIcon>
                              <CloudDownloadIcon />
                            </ListItemIcon>
                            Download PDF
                          </MenuItem>
                          <MenuItem
                            id="archive-summary-button"
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
                        </Menu>
                        <IconButton
                          onClick={() => {
                            // TODO: Communicate with parent component instead of using navigate.
                            navigate(`/orgs/${orgID}/summaries`);
                          }}
                          color="inherit"
                        >
                          <CloseIcon />
                        </IconButton>
                      </>
                    </Grid>
                  </Grid>

                  <SummaryEditor reactQuillRef={reactQuillSummaryRef} />
                </Paper>
              </Grid>
            </Grid>
          </Scrollable>
        </Grid>

        <Sidepane
          title="Quotes and themes"
          open={sidepaneOpen}
          setOpen={setSidepaneOpen}
        >
          <SummarySidebar reactQuillRef={reactQuillSummaryRef} />
        </Sidepane>

        <SummaryDeleteDialog
          open={openDeleteDialog}
          setOpen={setOpenDeleteDialog}
          summary={summary}
        />
      </Grid>
    </Grid>
  );
}
