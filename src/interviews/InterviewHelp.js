import Grid from "@material-ui/core/Grid";
import React from "react";
import interviewGraphic from "../assets/images/interview.svg";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  helpText: {
    padding: "2rem",
  },
});

export default function InterviewHelp(props) {
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
          src={interviewGraphic}
          alt="Contents illustration"
        />
      </Grid>
      <Grid item md={5} lg={4} className={classes.helpText}>
        <h3>Keep track of your customer notes and conversations</h3>
        <br />
        <h5>
          Tag customer interviews with themes here. Find patterns in the voice
          of the customer in the analysis tab.
        </h5>
      </Grid>
    </Grid>
  );
}
