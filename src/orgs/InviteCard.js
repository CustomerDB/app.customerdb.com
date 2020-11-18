import React, { useContext, useState } from "react";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { Link } from "react-router-dom";
import UserAuthContext from "../auth/UserAuthContext";
import FirebaseContext from "../util/FirebaseContext";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";

export default function InviteCard({ orgID, orgName, inviteSentTimestamp }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const linkedTitle = orgID && orgName && (
    <Link style={{ color: "black" }} to={`/orgs/${orgID}`}>
      {orgName}
    </Link>
  );

  const onAccept = (e) => {
    if (!db || !oauthClaims || !oauthClaims.email) {
      return;
    }

    return db
      .collection("organizations")
      .doc(orgID)
      .collection("members")
      .doc(oauthClaims.email)
      .update({
        email: oauthClaims.email,
        displayName: oauthClaims.name,
        photoURL: oauthClaims.picture,
        invited: false,
        active: true,
        joinedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        console.debug("joined!");
      });
  };

  const onIgnore = (e) => {
    const ignoreInviteFunc = firebase
      .functions()
      .httpsCallable("auth-ignoreInvite");

    ignoreInviteFunc({ orgID: orgID }).then(() => {});
  };

  return (
    <Card
      style={{
        margin: "1rem",
        borderRadius: "0.5rem",
        maxHeight: "10rem",
        width: "20rem",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
          {linkedTitle}
        </Typography>
        <CardActions>
          <Button
            startIcon={<ClearIcon />}
            size="small"
            variant="contained"
            onClick={onIgnore}
          >
            Ignore
          </Button>
          <Button
            startIcon={<CheckIcon />}
            size="small"
            color="secondary"
            variant="contained"
            onClick={onAccept}
          >
            Accept
          </Button>
        </CardActions>
      </CardContent>
    </Card>
  );
}
