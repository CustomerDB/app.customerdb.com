import React from "react";

import Grid from "@material-ui/core/Grid";

export default function SummarySidebar({ reactQuillRef }) {
  return (
    <Grid
      container
      item
      md={4}
      xl={3}
      direction="column"
      justify="flex-start"
      alignItems="stretch"
      spacing={0}
      style={{
        overflowX: "hidden",
        paddingTop: "1rem",
      }}
    ></Grid>
  );
}
