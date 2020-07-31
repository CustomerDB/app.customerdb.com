import React, { useEffect, useState, useContext } from "react";

import event from "../analytics/event.js";

import loginFigure from "../assets/images/login.svg";
import logo from "../assets/images/logo.svg";

import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { useParams, useNavigate } from "react-router-dom";

import UserAuthContext from "./UserAuthContext.js";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function JoinOrg(props) {
  const auth = useContext(UserAuthContext);

  const [inviteFailed, setInviteFailed] = useState(false);
  const [reason, setReason] = useState(undefined);

  let navigate = useNavigate();

  // Get invite id.
  let { id } = useParams();
  let orgID = id;

  useEffect(() => {
    console.log("useEffect auth", auth);
    if (!auth || !auth.oauthClaims || !auth.oauthClaims.orgID) {
      return;
    }
    navigate(`/orgs/${orgID}`);
  }, [auth, orgID, navigate]);

  const login = () => {
    window.firebase
      .auth()
      .setPersistence(window.firebase.auth.Auth.Persistence.SESSION)
      .then(function () {
        window.firebase.auth().signInWithRedirect(provider);
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  const onFail = () => {
    //failed
    setReason(
      "Couldn't add you to the organization. Please reach out to your administrator and verify your email has been added."
    );
    setInviteFailed(true);
    return;
  };

  const join = () => {
    let user = auth.oauthUser;

    event("join_org", {
      orgID: orgID,
      userID: user.uid,
    });

    setInviteFailed(false);
    setReason(undefined);

    // Get invite object.
    db.collection("organizations")
      .doc(orgID)
      .collection("members")
      .doc(user.email)
      .set(
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          invited: false,
          active: true,
          joinedTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .then(() => {
        // Success
        db.collection("userToOrg")
          .doc(user.email)
          .set({
            orgID: orgID,
          })
          .catch(onFail);
      })
      .catch(onFail);
  };

  const logout = () => {
    window.firebase
      .auth()
      .signOut()
      .catch(function (error) {
        console.error(error);
      });
  };

  if (auth.oauthUser === null) {
    return (
      <LoginForm
        cta={<p>Log in to join organization</p>}
        action={<Button onClick={login}>Login with Google</Button>}
      />
    );
  }
  let inviteFailedMessage;
  if (inviteFailed) {
    inviteFailedMessage = <Alert variant="danger">{reason}</Alert>;
  }

  return (
    <LoginForm
      status={inviteFailedMessage}
      cta={
        <p>
          Join organization with email {auth.oauthUser.email} (
          <Button onClick={logout} variant="link">
            Logout
          </Button>
          )
        </p>
      }
      action={<Button onClick={join}>Join</Button>}
    />
  );
}

function LoginForm(props) {
  return (
    <Container>
      <Row className="align-items-center">
        <Col md={6}>
          <Row className="align-items-center">
            <Col className="pb-5">
              <img style={{ width: "50%" }} src={logo} alt="CustomerDB logo" />
            </Col>
          </Row>
          <Row>
            <Col>{props.cta}</Col>
          </Row>
          <Row>
            <Col>{props.status}</Col>
          </Row>
          <Row className="pt-5">
            <Col>{props.action}</Col>
          </Row>
        </Col>
        <Col md={6}>
          <img style={{ width: "100%" }} src={loginFigure} alt="..." />
        </Col>
      </Row>
    </Container>
  );
}
