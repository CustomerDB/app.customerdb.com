import React, { useContext, useEffect, useState } from "react";
import { TextValidator, ValidatorForm } from "react-material-ui-form-validator";
import { useNavigate } from "react-router-dom";

import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import Link from "@material-ui/core/Link";
import googleLogo from "../assets/images/google-logo.svg";
import loginFigure from "../assets/images/login.svg";
import logo from "../assets/images/logo.svg";
import { makeStyles } from "@material-ui/core/styles";
import LinearProgress from "@material-ui/core/LinearProgress";

const useStyles = makeStyles((theme) => {
  return {
    loginText: {
      paddingTop: "2rem",
    },
    alert: {
      marginTop: "1rem",
      marginBottom: "1rem",
    },
    links: {
      marginLeft: "2rem",
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
    or: {
      textAlign: "center",
      borderBottom: "1px solid #000",
      lineHeight: "0.1em",
      margin: "10px 0 20px",
      width: "100%",
      paddingTop: "1.5rem",
      "& span": {
        background: "#fff",
        padding: "0 10px",
      },
    },
  };
});

export default function Signup(props) {
  const firebase = useContext(FirebaseContext);

  const [name, setName] = useState();
  const [password, setPassword] = useState();
  const [repeatPassword, setRepeatPassword] = useState();
  const [errorMessage, setErrorMessage] = useState(undefined);
  const [loading, setLoading] = useState(false);

  const defaultErrorMessage =
    "Couldn't add you to the organization. Please reach out to your administrator and verify your email has been added.";

  const classes = useStyles();

  var provider = new firebase.auth.GoogleAuthProvider();

  let navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(urlParams.get("email"));

  const urlProvidedEmail = urlParams.get("email");

  const signupGoogleFunc = firebase
    .functions()
    .httpsCallable("auth-signupGoogle");
  const signupEmailFunc = firebase
    .functions()
    .httpsCallable("auth-signupEmail");

  useEffect(() => {
    ValidatorForm.addValidationRule("isPasswordMatch", (value) => {
      if (value !== password) {
        return false;
      }
      return true;
    });

    return () => {
      ValidatorForm.removeValidationRule("isPasswordMatch");
    };
  });

  useEffect(() => {
    firebase
      .auth()
      .getRedirectResult()
      .then((result) => {
        if (!result || !result.user) {
          return;
        }

        return signupGoogle(result.user).catch(() => {
          setErrorMessage(defaultErrorMessage);
        });
      });
  });

  const loginGoogle = () => {
    firebase
      .auth()
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        firebase.auth().signInWithRedirect(provider);
      })
      .catch(() => {
        setErrorMessage(defaultErrorMessage);
      });
  };

  const signupGoogle = (user) => {
    setLoading(true);

    return signupGoogleFunc(user.email)
      .then((result) => {
        navigate("/orgs");
      })
      .catch((err) => {
        setLoading(false);

        if (err.message.endsWith("user not invited")) {
          setErrorMessage(
            <>
              It doesn't look like you have been invited to an organization yet.
              Please go to <a href="https://customerdb.com">customerdb.com</a>{" "}
              to sign up for our waitlist.
            </>
          );
        } else if (err.message.endsWith("user already exists")) {
          navigate("/orgs");
        } else {
          setErrorMessage(
            "An error occured while trying to sign you in. Please try again later"
          );
        }
      });
  };

  const signupEmail = () => {
    setLoading(true);
    return signupEmailFunc({ name, email, password })
      .then((result) => {
        return firebase
          .auth()
          .signInWithEmailAndPassword(email, password)
          .then((user) => {
            navigate("/orgs");
          });
      })
      .catch((err) => {
        setLoading(false);

        if (err.message.endsWith("user not invited")) {
          setErrorMessage(
            <>
              It doesn't look like you have been invited to an organization yet.
              Please go to <a href="https://customerdb.com">customerdb.com</a>{" "}
              to sign up for our waitlist.
            </>
          );
        } else if (err.message.endsWith("user already exists")) {
          setErrorMessage(
            <>
              It looks like you already have an account with us. Please go to{" "}
              <a href="/login">login to get started.</a>
            </>
          );
        } else {
          setErrorMessage(
            "An error occured while trying to sign you in. Please try again later"
          );
        }
      });
  };

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
                <p>
                  Create an account by filling in the form below. If you already
                  have a CustomerDB account <a href="/login">log in here</a>
                </p>
                {loading && <LinearProgress />}
              </Grid>
            </Grid>
            <Grid container item>
              <Grid item>
                {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              </Grid>
            </Grid>
            <Grid container item>
              <ValidatorForm onSubmit={signupEmail} style={{ width: "100%" }}>
                <TextValidator
                  autoComplete="username"
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  label="Email"
                  disabled={urlProvidedEmail || loading}
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                  validators={["required", "isEmail"]}
                  errorMessages={[
                    "Email is required",
                    "Not a valid email address",
                  ]}
                  value={email}
                />
                <TextValidator
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  disabled={loading}
                  label="Full name"
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  validators={["required"]}
                  errorMessages={["Full name is required"]}
                  value={name}
                />
                <TextValidator
                  autoComplete="password"
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  disabled={loading}
                  label="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                  type="password"
                  validators={["required", "minStringLength:6"]}
                  errorMessages={[
                    "Password is required",
                    "Password is too short",
                  ]}
                  value={password}
                />
                <TextValidator
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  disabled={loading}
                  label="Repeat password"
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  name="repeatPassword"
                  type="password"
                  validators={["isPasswordMatch", "required"]}
                  errorMessages={[
                    "Passwords didn't match",
                    "Repeat password is required",
                  ]}
                  value={repeatPassword}
                />
                <Button
                  type="submit"
                  fullWidth
                  disabled={loading}
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                >
                  Create account
                </Button>
              </ValidatorForm>
            </Grid>
            <Grid container item>
              <Grid container>
                <p className={classes.or}>
                  <span>Or</span>
                </p>
              </Grid>
            </Grid>
            <Grid container item>
              <Grid container>
                <Button
                  className={classes.loginButton}
                  color="primary"
                  fullWidth
                  disabled={loading}
                  variant="outlined"
                  onClick={loginGoogle}
                >
                  <img alt="Google logo" src={googleLogo} />
                  Sign in with Google
                </Button>
              </Grid>
            </Grid>
          </Grid>
          <Grid item md={6}>
            <Hidden smDown>
              <img className={classes.graphic} src={loginFigure} alt="..." />
            </Hidden>
          </Grid>
        </Grid>
        <Grid container item>
          <Grid item>
            <p>
              <Link href="/terms">Terms of use</Link>
              <Link className={classes.links} href="/privacy">
                Privacy
              </Link>
              <Link className={classes.links} href="/cookies">
                Cookies
              </Link>
              <Link
                component="button"
                className={classes.links}
                onClick={() => window.displayPreferenceModal()}
              >
                Do Not Sell My Information
              </Link>
            </p>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
