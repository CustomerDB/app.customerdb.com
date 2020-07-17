import React from "react";
import { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

import topFigure from "./assets/images/top-figure.svg";
import logo from "./assets/images/logo.svg";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function Login(props) {
  const navigate = useNavigate();
  const [loginSuccess, setLoginSuccess] = useState(undefined);

  const login = () => {
    window.firebase
      .auth()
      .setPersistence(window.firebase.auth.Auth.Persistence.SESSION)
      .then(function () {
        window.firebase.auth().signInWithRedirect(provider);
      });
  };

  useEffect(() => {
    if (props.oauthUser !== null) {
      db.collection("userToOrg")
        .doc(props.oauthUser.email)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            // Couldn't find your org.
            setLoginSuccess(false);
            return;
          }

          let userToOrg = doc.data();
          navigate(`/orgs/${userToOrg.orgID}`);
        })
        .catch((e) => {
          console.error("failed to read userToOrg mapping", e);
        });
    }
  }, [navigate, props.oauthUser, props.oauthLoading]);

  let loginFailedMessage =
    loginSuccess === false ? (
      <Alert variant="danger">Login failed</Alert>
    ) : (
      <div></div>
    );

  return loginSuccess === undefined &&
    props.oauthUser == null &&
    props.oauthLoading == false ? (
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
            <Col>{loginFailedMessage}</Col>
          </Row>
          <Row className="pt-5">
            <Col>
              <Button onClick={login}>Login with Google</Button>
            </Col>
          </Row>
        </Col>
        <Col md={6}>
          <img style={{ width: "100%" }} src={topFigure} alt="..." />
        </Col>
      </Row>
    </Container>
  ) : (
    <></>
  );
}
