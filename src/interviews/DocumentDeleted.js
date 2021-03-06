// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
