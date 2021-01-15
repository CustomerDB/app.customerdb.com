import React from "react";
import Quote from "./Quote.js";
import Grid from "@material-ui/core/Grid";

export default function QuoteSidepane({ highlight }) {
  return (
    <Grid
      container
      style={{ backgroundColor: "#f9f9f9", flexGrow: 1 }}
      alignItems="baseline"
    >
      <Quote highlight={highlight} />
    </Grid>
  );
}
