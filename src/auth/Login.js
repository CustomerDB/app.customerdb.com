import { TextValidator, ValidatorForm } from "react-material-ui-form-validator";
import { useContext, useEffect, useState } from "react";

import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import Link from "@material-ui/core/Link";
import React from "react";
import UserAuthContext from "./UserAuthContext.js";
import googleLogo from "../assets/images/google-logo.svg";
import loginFigure from "../assets/images/login.svg";
import logo from "../assets/images/logo.svg";
import { makeStyles } from "@material-ui/core/styles";
import { useNavigate } from "react-router-dom";

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

export default function Login(props) {
  const navigate = useNavigate();
  const [loginFailedMessage, setLoginFailedMessage] = useState(undefined);
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();

  const auth = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  var provider = new firebase.auth.GoogleAuthProvider();

  const classes = useStyles();

  const loginGoogle = () => {
    firebase
      .auth()
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        firebase.auth().signInWithRedirect(provider);
      });
  };

  const loginEmail = () => {
    firebase
      .auth()
      .setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        return firebase.auth().signInWithEmailAndPassword(email, password);
      })
      .catch((error) => {
        setLoginFailedMessage("Login failed. Please try again");
      });
  };

  useEffect(() => {
    if (!auth.oauthClaims || !auth.oauthClaims.orgs) {
      return;
    }
    const db = firebase.firestore();

    db.collection("userToOrg")
      .doc(auth.oauthUser.email)
      .get()
      .then((doc) => {
        let userToOrg = doc.data();
        if (!userToOrg.orgID) {
          return;
        }
        navigate(`/orgs/${userToOrg.orgID}`);
      });
  }, [auth.oauthClaims, navigate, auth.oauthUser.email, firebase]);

  return auth.oauthUser === null && auth.oauthLoading === false ? (
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
                  Log in by clicking the button below.
                  <br />
                  If you don't have an account yet,{" "}
                  <a href="https://niklas415573.typeform.com/to/at7S5LVl">
                    join the wait list
                  </a>
                </p>
              </Grid>
            </Grid>
            <Grid container item>
              <Grid item>
                {loginFailedMessage && (
                  <Alert severity="error">{loginFailedMessage}</Alert>
                )}
              </Grid>
            </Grid>
            <Grid container item>
              <ValidatorForm onSubmit={loginEmail} style={{ width: "100%" }}>
                <TextValidator
                  autoComplete="username"
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  label="Email"
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                  validators={["required", "isEmail"]}
                  errorMessages={["Email is required", "Not a valid email"]}
                  value={email}
                />
                <TextValidator
                  autoComplete="password"
                  variant="outlined"
                  margin="normal"
                  fullWidth
                  label="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                  type="password"
                  validators={["required"]}
                  errorMessages={["Password is required"]}
                  value={password}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                >
                  Sign In
                </Button>
                <Link variant="body2" href="/reset-password">
                  Forgot password?
                </Link>
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
  ) : (
    <></>
  );
}
