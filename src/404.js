import Grid from "@material-ui/core/Grid";
import React from "react";
import illustration from "./assets/images/404.svg";

export default function Error404(props) {
  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems="center"
      style={{ marginTop: "3rem" }}
    >
      <Grid item md={3}>
        <h1>Whoops! This was not supposed to happen.</h1>
        <h3>
          <a href="/">Get back to safety</a>
        </h3>
        <img
          src={illustration}
          alt="404 illustration"
          style={{ width: "100%" }}
        />
      </Grid>
    </Grid>
  );
}
