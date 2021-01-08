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
import ArchiveIcon from "@material-ui/icons/Archive";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import CloseIcon from "@material-ui/icons/Close";
import SummaryEditor from "./SummaryEditor.js";
import Paper from "@material-ui/core/Paper";
import Scrollable from "../shell/Scrollable.js";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  documentPaper: {
    margin: "0 1rem 0 2rem",
    padding: "0 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
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
      console.debug("received summary snapshot");
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
              <Paper className={classes.documentPaper} elevation={0}>
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
                          if (summaryRef) {
                            let newName = e.target.innerText
                              .replace(/(\r\n|\n|\r)/gm, " ")
                              .replace(/\s+/g, " ")
                              .trim();

                            console.debug("setting document name", newName);

                            summaryRef.update({ name: newName });
                          }
                        }}
                      />
                    </Typography>
                  </Grid>

                  <Hidden xsDown>
                    <Grid container item xs={2}>
                      <Collaborators dbRef={summaryRef} />
                    </Grid>
                  </Hidden>

                  <Grid container item xs={5} justify="flex-end">
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
                          <ListItemIcon>
                            <ArchiveIcon />
                          </ListItemIcon>
                          Archive
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
                </Grid>

                <SummaryEditor reactQuillRef={reactQuillSummaryRef} />
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>

      <Hidden smDown>
        <SummarySidebar reactQuillRef={reactQuillSummaryRef} />
      </Hidden>

      <SummaryDeleteDialog
        open={openDeleteDialog}
        setOpen={setOpenDeleteDialog}
        summary={summary}
      />
    </Grid>
  );
}
