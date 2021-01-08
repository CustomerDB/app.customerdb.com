import React from "react";
import Shell from "../shell/Shell.js";
import Grid from "@material-ui/core/Grid";

export default function Summaries() {
  return (
    <Shell>
      <Grid
        container
        className="fullHeight"
        style={{ position: "relative" }}
      ></Grid>
    </Shell>
  );
}
