import Grid from "@material-ui/core/Grid";
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import personGraphic from "../assets/images/person.svg";

const useStyles = makeStyles({
  helpText: {
    padding: "2rem",
  },
});

export default function PersonHelp(props) {
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
          src={personGraphic}
          alt="Contents illustration"
        />
      </Grid>
      <Grid item md={5} lg={4} className={classes.helpText}>
        <h3>Organize your customer contacts</h3>
        <br />
        <h5>
          The more information you add here, the more insights you can get
          during your analysis.
        </h5>
      </Grid>
    </Grid>
  );
}
