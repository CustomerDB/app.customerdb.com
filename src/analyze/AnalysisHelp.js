import Grid from "@material-ui/core/Grid";
import React from "react";
import analyzeGraphic from "../assets/images/analyze.svg";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  helpText: {
    padding: "2rem",
  },
});

export default function AnalysisHelp(props) {
  const classes = useStyles();

  return (
    <Grid
      container
      item
      md={9}
      xl={10}
      direction="row"
      justify="center"
      alignItems="center"
    >
      <Grid container item md={5} lg={4}>
        <img
          style={{ width: "100%" }}
          src={analyzeGraphic}
          alt="Contents illustration"
        />
      </Grid>
      <Grid item md={5} lg={4} className={classes.helpText}>
        <h3>Analyze your customer interviews</h3>
        <br />
        <h5>
          Collaborate with your team to find patterns in verbatims from multiple
          customers.
        </h5>
      </Grid>
    </Grid>
  );
}
