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

import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import Linkify from "react-linkify";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext";
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

export default function Profile(props) {
  const auth = useContext(UserAuthContext);
  const { membersRef } = useFirestore();
  const [displayName, setDisplayName] = useState();
  const [changeName, setChangeName] = useState();
  const [memberRef, setMemberRef] = useState();

  const classes = useStyles();

  useEffect(() => {
    if (!membersRef || !auth.oauthClaims || !auth.oauthClaims.email) {
      return;
    }

    let ref = membersRef.doc(auth.oauthClaims.email);

    setMemberRef(ref);

    return ref.onSnapshot((doc) => {
      let data = doc.data();
      setDisplayName(data.displayName);
      setChangeName(data.displayName);
    });
  }, [auth.oauthClaims.email, membersRef, auth.oauthClaims]);

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
            <Grid item xs={12} md={6}>
              <Grid item>
                <p>
                  <b>Full name</b>
                </p>
                <TextField
                  value={changeName}
                  onChange={(event) => {
                    setChangeName(event.target.value);
                  }}
                />
              </Grid>
              <Grid item style={{ paddingTop: "2rem" }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    memberRef.update({
                      displayName: changeName,
                    });
                  }}
                >
                  Save changes
                </Button>
              </Grid>
            </Grid>
            <Grid container item xs={12} md={6}>
              <Grid container item xs={12} justify="center">
                <Avatar
                  style={{ height: "10rem", width: "10rem" }}
                  alt={displayName}
                  src={auth.oauthClaims.picture}
                />
              </Grid>
              <Grid container item xs={12} justify="center">
                <Typography
                  align="center"
                  variant="h6"
                  style={{ fontWeight: "bold" }}
                  component="h2"
                >
                  {displayName}
                </Typography>
              </Grid>
              <Grid container item xs={12} justify="center">
                <Linkify>{auth.oauthClaims.email}</Linkify>
              </Grid>
              <Grid container item xs={12} justify="center">
                {auth.oauthClaims.admin ? "Administrator" : "Member"}
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
}
