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

import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function PrivacySettings() {
  const classes = useStyles();

  return (
    <Grid container item xs={12} spacing={0} justify="center">
      <Card className={classes.fullWidthCard}>
        <CardContent>
          <Button onClick={() => window.displayPreferenceModal()}>
            Manage Cookie Preferences
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
}
