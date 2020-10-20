import { TextValidator, ValidatorForm } from "react-material-ui-form-validator";
import { useContext, useState } from "react";

import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Link from "@material-ui/core/Link";
import React from "react";
import logo from "../assets/images/logo.svg";
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

export default function ResetPassword(props) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState();

  const firebase = useContext(FirebaseContext);

  const classes = useStyles();

  const resetPassword = () => {
    if (!firebase || !email) {
      return;
    }
    console.debug(`TODO reset password for ${email}`);

    let actionCodeSettings = {
      url: process.env.REACT_APP_DOMAIN,
      handleCodeInApp: true,
    };

    firebase
      .auth()
      .sendPasswordResetEmail(email, actionCodeSettings)
      .then(() => {
        setMessage("Check your email for further instructions");
      })
      .catch((error) => {
        console.error(error);
        setMessage(
          <p>
            An error occurred. Please contact
            <Link href="mailto:support@quantap.com">support@quantap.com</Link>
          </p>
        );
      });
  };

  return (
    <Grid container justify="center">
      <Grid container item md={6} xs={10}>
        <Grid container item alignItems="center">
          <Grid item xs>
            <Grid container item alignItems="center">
              <Grid item>
                <Link href="/">
                  <img
                    className={classes.logo}
                    src={logo}
                    alt="CustomerDB logo"
                  />
                </Link>
              </Grid>
            </Grid>
            <Grid container item style={{ marginTop: "2rem" }}>
              <Grid item>
                {message && <Alert severity="info">{message}</Alert>}
              </Grid>
            </Grid>
            <Grid container item>
              <ValidatorForm onSubmit={resetPassword} style={{ width: "100%" }}>
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
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  className={classes.submit}
                >
                  Reset password
                </Button>
              </ValidatorForm>
            </Grid>
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
