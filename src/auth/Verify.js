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

import { Loading } from "../util/Utils.js";

import { useNavigate } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import logo from "../assets/images/logo.svg";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles((theme) => {
  return {
    loginText: {
      paddingTop: "2rem",
    },
    alert: {
      marginTop: "1rem",
      marginBottom: "1rem",
    },
    loginButton: {
      marginTop: "2rem",
      marginBottom: "4rem",
    },
    logo: {
      width: "50%",
      marginTop: "2rem",
    },
    graphic: {
      width: "100%",
    },
    submit: {
      margin: theme.spacing(3, 0, 2),
    },
  };
});

export default function Verify() {
  const classes = useStyles();

  const firebase = useContext(FirebaseContext);

  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get("oobCode");
  const email = urlParams.get("email");

  const navigate = useNavigate();

  const sendVerifyEmailFunc = firebase
    .functions()
    .httpsCallable("auth-sendVerifyEmail");

  const [verificationSucceeded, setVerificationSucceeded] = useState();
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (verificationSucceeded) {
      navigate("/orgs");
    }
  }, [verificationSucceeded, navigate]);

  useEffect(() => {
    firebase
      .auth()
      .checkActionCode(oobCode || "")
      .then((info) => {
        return firebase
          .auth()
          .signInWithEmailLink(email, window.location.href)
          .then((result) => {
            setVerificationSucceeded(true);
          });
      })
      .catch(() => {
        setVerificationSucceeded(false);
      });
  }, [email, firebase, oobCode]);

  if (verificationSucceeded === undefined) {
    return <Loading />;
  }

  return (
    <Grid container justify="center">
      <Grid container item md={6} xs={10}>
        <Grid container item alignItems="center">
          <Grid item md={6}>
            <Grid container item alignItems="center">
              <Grid item>
                <img
                  className={classes.logo}
                  src={logo}
                  alt="CustomerDB logo"
                />
              </Grid>
            </Grid>
            <Grid container item>
              <Grid item className={classes.loginText}>
                <h3>
                  You are one step away from getting started with CustomerDB
                </h3>
                {!emailSent ? (
                  <>
                    <p>
                      You should already have an email in your inbox with a
                      verification link.
                    </p>

                    <Button
                      component="button"
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        sendVerifyEmailFunc().then(() => {
                          setEmailSent(true);
                        });
                      }}
                    >
                      Resend verification email
                    </Button>
                  </>
                ) : (
                  <p>Email sent</p>
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
