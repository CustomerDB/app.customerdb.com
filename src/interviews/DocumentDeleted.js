import Moment from "react-moment";
import React from "react";

import Grid from "@material-ui/core/Grid";

export default function DocumentDeleted(props) {
  let relativeTime = undefined;
  if (props.document.deletionTimestamp) {
    relativeTime = (
      <Moment fromNow date={props.document.deletionTimestamp.toDate()} />
    );
  }

  return (
    <Grid container>
      <Grid container item xs={12}>
        <h3>{props.document.name}</h3>
      </Grid>
      <Grid container item xs={12}>
        <p>
          This document was deleted {relativeTime} by {props.document.deletedBy}
        </p>
      </Grid>
    </Grid>
  );
}
