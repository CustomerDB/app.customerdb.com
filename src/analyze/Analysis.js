import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState } from "react";

import AnalysisClusterTab from "./AnalysisClusterTab.js";
import AnalysisDataTab from "./AnalysisDataTab.js";
import AnalysisSummaryTab from "./AnalysisSummaryTab.js";
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
import ContentEditable from "react-contenteditable";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";

const useStyles = makeStyles({
  paper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    margin: "1rem",
    padding: "1rem",
  },
  tabs: {
    width: "100%",
  },
  view: {
    position: "relative",
    flexGrow: 1,
  },
});

export default function Analysis(props) {
  const { orgID, analysisID, tabID, tagID } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState();
  const [selectedTab, setSelectedTab] = useState();

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

  useEffect(() => {
    if (!tabID) {
      setSelectedTab(0);
      return;
    }

    if (tabID === "themes") {
      setSelectedTab(0);
    }

    if (tabID === "interviews") {
      setSelectedTab(1);
    }

    if (tabID === "summary") {
      setSelectedTab(2);
    }
  }, [tabID]);

  const handleTabChange = (e, newValue) => {
    let tab = "";
    if (newValue === 0) {
      tab = "themes";
    }
    if (newValue === 1) {
      tab = "interviews";
    }
    if (newValue === 2) {
      tab = "summary";
    }
    navigate(`/orgs/${orgID}/analyze/${analysisID}/${tab}`);
  };

  if (!analysis) {
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
                <Typography gutterBottom variant="h4" component="h2">
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

  let view = <></>;

  if (selectedTab === 0) {
    view = (
      <AnalysisClusterTab
        key={`${analysisID}-${tagID}`}
        orgID={orgID}
        analysis={analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

  if (selectedTab === 1) {
    view = (
      <AnalysisDataTab
        analysis={analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
      />
    );
  }

  if (selectedTab === 2) {
    view = (
      <AnalysisSummaryTab
        key={`${analysisID}-${tagID}`}
        orgID={orgID}
        analysis={analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

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
          <Typography gutterBottom variant="h4" component="h2">
            <ContentEditable
              html={props.analysis.name}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.target.blur();
                }
              }}
              onBlur={(e) => {
                console.log("e", e, "props.analysisRef", props.analysisRef);
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
        <Grid>
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
              navigate(`/orgs/${orgID}/analyze`);
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
          <Grid item xs={12} style={{ maxHeight: "3rem" }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              indicatorColor="secondary"
              textColor="primary"
              variant="fullWidth"
              aria-label="full width"
              className={classes.tabs}
            >
              <Tab label="Themes" id="themes" aria-controls="tabpanel-themes" />
              <Tab
                label="Interviews"
                id="interviews"
                aria-controls="tabpanel-interviews"
              />
              <Tab
                label="Summary"
                id="summary"
                aria-controls="tabpanel-summary"
              />
            </Tabs>
          </Grid>
          {view}
        </Paper>
      </Grid>
    </>
  );
}
