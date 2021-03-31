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

import { useNavigate } from "react-router-dom";

import React from "react";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";

export default function EmptyStateHelp({
  title,
  description,
  buttonText,
  path,
}) {
  const navigate = useNavigate();

  return (
    <Grid container item xs={12} style={{ flexGrow: 1, padding: "2rem" }}>
      <Grid
        container
        item
        xs={12}
        style={{ marginTop: "3rem" }}
        justify="center"
      >
        <Typography variant="h6" style={{ fontWeight: "bold" }} gutterBottom>
          {title}
        </Typography>
      </Grid>
      <Grid container item xs={12} justify="center">
        <Grid
          item
          xs={12}
          sm={6}
          lg={4}
          justify="center"
          style={{ textAlign: "center" }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {description}
          </Typography>
        </Grid>
      </Grid>
      <Grid
        container
        item
        xs={12}
        style={{ marginTop: "1rem" }}
        justify="center"
      >
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            navigate(path);
          }}
        >
          {buttonText}
        </Button>
      </Grid>
    </Grid>
  );
}
