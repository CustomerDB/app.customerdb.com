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
