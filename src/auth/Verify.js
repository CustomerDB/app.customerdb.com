import React, { useContext, useEffect, useState } from "react";

import { Loading } from "../util/Utils.js";

import { useNavigate } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import logo from "../assets/images/logo.svg";
import Alert from "@material-ui/lab/Alert";
import { makeStyles } from "@material-ui/core/styles";

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
  const [errorMessage, setErrorMessage] = useState(undefined);

  useEffect(() => {
    if (verificationSucceeded) {
      navigate("/orgs");
    }
  }, [verificationSucceeded]);

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
  }, []);

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
                <h3>We need to verify email</h3>
                {!emailSent ? (
                  <>
                    <p>
                      You should already have an email in your inbox with a
                      verification link.
                    </p>
                    <p>
                      In case you didn't receive an email yet, click{" "}
                      <a
                        href="#"
                        onClick={() => {
                          sendVerifyEmailFunc().then(() => {
                            setEmailSent(true);
                          });
                        }}
                      >
                        here to resend
                      </a>{" "}
                      the verification email
                    </p>
                  </>
                ) : (
                  <p>Email sent</p>
                )}
              </Grid>
            </Grid>
            <Grid container item>
              <Grid item>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
