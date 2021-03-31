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
