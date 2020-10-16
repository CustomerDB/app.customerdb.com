import { Navigate, useParams } from "react-router-dom";
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
  const { orgID, analysisID, tabID, tagID } = useParams();

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
    return <Loading />;
  }

  // Give a hint if this analysis was deleted while in view.
  if (analysis.deletionTimestamp !== "") {
    let relativeTime = (
      <Moment fromNow date={analysis.deletionTimestamp.toDate()} />
    );

    return (
      <Grid container item sm={9} xl={10} spacing={0}>
        <Paper className={classes.paper}>
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

  // Redirect if tab does not exist
  if (tabID && !["data", "cluster", "summary"].includes(tabID)) {
    return <Navigate to="/404" />;
  }

  let view = <></>;

  if (!tabID || tabID === "summary") {
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

  if (tabID === "data") {
    view = (
      <AnalysisDataTab
        analysis={analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
      />
    );
  }

  if (tabID === "cluster") {
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

  return (
    <>
      <Grid container item sm={9} xl={10} spacing={0}>
        <Paper className={classes.paper}>{view}</Paper>
      </Grid>
    </>
  );
}
