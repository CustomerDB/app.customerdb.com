import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

import AnalysisClusterTab from "./AnalysisClusterTab.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import AnalysisDeleteModal from "./AnalysisDeleteModal.js";
import ArchiveIcon from "@material-ui/icons/Archive";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import ContentEditable from "react-contenteditable";
import Tooltip from "@material-ui/core/Tooltip";
import InterviewSelector from "./InterviewSelector.js";
import Sidepane from "../shell/Sidepane.js";

const useStyles = makeStyles({
  paper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    margin: "1rem",
    padding: "1rem",
  },
  view: {
    position: "relative",
    flexGrow: 1,
  },
});

export default function Analysis(props) {
  const { orgID, analysisID } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState();
  const [sidepaneOpen, setSidepaneOpen] = useState(true);

  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState();

  const classes = useStyles();

  useEffect(() => {
    if (!props.analysisRef) {
      return;
    }

    return props.analysisRef.onSnapshot((doc) => {
      let data = doc.data();
      data.ID = doc.id;
      setAnalysis(data);
    });
  }, [props.analysisRef]);

  if (!analysis) {
    console.log("No analysis - waiting for something");
    return <Loading />;
  }

  // Give a hint if this analysis was deleted while in view.
  if (analysis.deletionTimestamp !== "") {
    let relativeTime = (
      <Moment fromNow date={analysis.deletionTimestamp.toDate()} />
    );

    return (
      <Grid container item sm={9} xl={10} spacing={0}>
        <Paper className={classes.paper} elevation={0}>
          <Grid container>
            <Grid container item xs={12} alignItems="flex-start">
              <Grid item xs={11}>
                <Typography
                  gutterBottom
                  variant="h6"
                  style={{ fontWeight: "bold" }}
                  component="h2"
                >
                  {analysis.name}
                </Typography>
                <p>
                  This analysis was deleted {relativeTime} by{" "}
                  {analysis.deletedBy}
                </p>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    );
  }

  let view = (
    <AnalysisClusterTab
      key={analysisID}
      orgID={orgID}
      analysis={analysis}
      analysisRef={props.analysisRef}
      documentsRef={props.documentsRef}
      allHighlightsRef={props.allHighlightsRef}
      setSidepaneOpen={setSidepaneOpen}
    />
  );

  let title = (
    <>
      <Grid
        container
        item
        xs={12}
        alignItems="flex-start"
        style={{ maxHeight: "3rem" }}
      >
        <Grid item xs={9}>
          <Typography
            gutterBottom
            variant="h6"
            style={{ fontWeight: "bold" }}
            component="h2"
          >
            <ContentEditable
              html={analysis.name}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur();
                }
              }}
              onBlur={(e) => {
                if (props.analysisRef) {
                  let newName = e.target.innerText
                    .replace(/(\r\n|\n|\r)/gm, " ")
                    .replace(/\s+/g, " ")
                    .trim();

                  props.analysisRef.update({ name: newName });
                }
              }}
            />
          </Typography>
        </Grid>
        <Grid container item xs={3} justify="flex-end">
          <Tooltip title="Select interviews">
            <IconButton
              onClick={() => {
                setSidepaneOpen(true);
              }}
            >
              <RecordVoiceOverIcon />
            </IconButton>
          </Tooltip>

          <IconButton
            color="primary"
            aria-label="Archive document"
            onClick={() => {
              setShowDeleteModal(true);
            }}
          >
            <ArchiveIcon />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate(`/orgs/${orgID}/boards`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </Grid>
      <AnalysisDeleteModal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
        }}
        analysisRef={props.analysisRef}
      />
    </>
  );

  return (
    <>
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
        <Paper className={classes.paper} elevation={0}>
          {title}
          {view}
          <Sidepane
            title="Select interview"
            open={sidepaneOpen}
            setOpen={setSidepaneOpen}
          >
            <InterviewSelector analysis={analysis} />
          </Sidepane>
        </Paper>
      </Grid>
    </>
  );
}
