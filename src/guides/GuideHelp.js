import Grid from "@material-ui/core/Grid";
import React from "react";
import guideGraphic from "../assets/images/guide.svg";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  helpText: {
    padding: "2rem",
  },
});

export default function GuideHelp(props) {
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
          src={guideGraphic}
          alt="Contents illustration"
        />
      </Grid>
      <Grid item md={5} lg={4} className={classes.helpText}>
        <h3>Keep interviews on track</h3>
        <br />
        <h5>
          Set up templates to guide future interviews here. Add topics to cover,
          key questions or prompts. This content will appear in the interview
          notes.
        </h5>
      </Grid>
    </Grid>
  );
}
