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

import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import TextField from "@material-ui/core/TextField";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function OrgSettings(props) {
  const { orgRef } = useFirestore();
  const [changeName, setChangeName] = useState();

  useEffect(() => {
    if (!orgRef) {
      return;
    }

    return orgRef.onSnapshot((doc) => {
      let o = doc.data();
      setChangeName(o.name);
    });
  }, [orgRef]);

  const classes = useStyles();

  return (
    <Grid container item xs={12} spacing={0} justify="center">
      <Card className={classes.fullWidthCard}>
        <CardContent>
          <Grid
            container
            item
            justify="flex-start"
            alignItems="center"
            spacing={2}
            xs={12}
          >
            <Grid container item xs={12}>
              <Grid container item xs={12} alignItems="center">
                <Grid item xs={9}>
                  <p>
                    <b>Organization Name</b>
                  </p>
                  <TextField
                    value={changeName}
                    onChange={(event) => {
                      setChangeName(event.target.value);
                    }}
                  />
                </Grid>
                <Grid item xs={3} style={{ paddingTop: "2rem" }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      orgRef.update({
                        name: changeName,
                      });
                    }}
                  >
                    Save changes
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
}
