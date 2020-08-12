import React from "react";
import { useContext, useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import UserAuthContext from "./UserAuthContext.js";

import loginFigure from "../assets/images/login.svg";
import logo from "../assets/images/logo.svg";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function Login(props) {
  const navigate = useNavigate();
  const [loginSuccess, setLoginSuccess] = useState(undefined);

  const auth = useContext(UserAuthContext);

  const login = () => {
    window.firebase
      .auth()
      .setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        window.firebase.auth().signInWithRedirect(provider);
      });
  };

  useEffect(() => {
    if (auth.oauthUser !== null) {
      db.collection("userToOrg")
        .doc(auth.oauthUser.email)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            setLoginSuccess(false);
            window.firebase.auth().signOut();
            return;
          }

          let userToOrg = doc.data();
          navigate(`/orgs/${userToOrg.orgID}`);
        })
        .catch((e) => {
          console.error("failed to read userToOrg mapping", e);
        });
    }
  }, [navigate, auth]);

  let loginFailedMessage =
    loginSuccess === false ? (
      <Alert variant="danger">Oops - looks like you don't have an account with us yet. If you think this is an error contact us at <a href="mailto:support@quantap.com">support@quantap.com</a></Alert>
    ) : (
      <div></div>
    );

  console.log("auth.oauthUser ", auth.oauthUser);
  console.log("auth.oauthLoading ", auth.oauthLoading);
  console.log("loginSuccess", loginSuccess);

  return auth.oauthUser === null &&
    auth.oauthLoading === false ? (
    <Container>
      <Row className="align-items-center">
        <Col md={6}>
          <Row className="align-items-center">
            <Col className="pb-5">
              <img style={{ width: "50%" }} src={logo} alt="CustomerDB logo" />
            </Col>
          </Row>
          <Row>
            <Col>
              <p>Log in by clicking the button below.</p>
              If you don't have an account yet,{" "}
              <a href="https://niklas415573.typeform.com/to/at7S5LVl">
                join the wait list
              </a>
              .
            </Col>
          </Row>
          <Row>
            <Col className="pt-3">{loginFailedMessage}</Col>
          </Row>
          <Row className="pt-5">
            <Col>
              <Button onClick={login}>Login with Google</Button>
            </Col>
          </Row>
        </Col>
        <Col md={6}>
          <img style={{ width: "100%" }} src={loginFigure} alt="..." />
        </Col>
      </Row>
      <Row>
        <Col>
          <p>
            <a href="/terms">Terms of use</a>
            <a className="ml-3" href="/privacy">
              Privacy
            </a>
            <a className="ml-3" href="/cookies">
              Cookies
            </a>
            <Button
              className="ml-3 p-0"
              variant="link"
              onClick={() => window.displayPreferenceModal()}
            >
              Do Not Sell My Information
            </Button>
          </p>
        </Col>
      </Row>
    </Container>
  ) : (
    <></>
  );
}
