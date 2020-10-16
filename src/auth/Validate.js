import { useContext, useState } from "react";

import Button from "@material-ui/core/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import Link from "@material-ui/core/Link";
import React from "react";
import TextField from "@material-ui/core/TextField";
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

export default function Validate(props) {
  const [email, setEmail] = useState();

  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get("oobCode");
  const navigate = useNavigate();

  const firebase = useContext(FirebaseContext);

  const classes = useStyles();

  const onClick = () => {
    firebase
      .auth()
      .checkActionCode(oobCode)
      .then((info) => {
        console.log(info);
        firebase
          .auth()
          .signInWithEmailLink(email, window.location.href)
          .then(() => {
            // TODO: Should redirect to password initialization.
            navigate("/");
          });
      })
      .catch((err) => {
        console.log(err);
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
                <p>Verify your email</p>
              </Grid>
            </Grid>
            <Grid container item>
              <TextField
                variant="outlined"
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                className={classes.submit}
                onClick={onClick}
              >
                Continue
              </Button>
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
