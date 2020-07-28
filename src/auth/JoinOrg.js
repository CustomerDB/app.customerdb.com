import React, { useEffect, useState, useContext } from "react";

import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
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
    setInviteFailed(false);
    setReason(undefined);

    let user = auth.oauthUser;

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
      <div className="outerContainer">
        <div className="loginContainer">
          <h2>CustomerDB</h2>
          <p>Log in to join organization</p>
          <br />
          <Button onClick={login}>Login with Google</Button>
        </div>
      </div>
    );
  }
  let inviteFailedMessage;
  if (inviteFailed) {
    inviteFailedMessage = <Alert variant="danger">{reason}</Alert>;
  }

  return (
    <div className="outerContainer">
      <div className="loginContainer">
        <h2>CustomerDB</h2>
        {inviteFailed ? (
          inviteFailedMessage
        ) : (
          <>
            <p>
              Join organization with email {auth.oauthUser.email}{" "}
              <Button onClick={logout} variant="link">
                Logout
              </Button>
            </p>
            <br />
            <Button onClick={join}>Join</Button>
          </>
        )}
      </div>
    </div>
  );
}
