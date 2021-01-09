import React, { useContext, useState, useEffect, useCallback } from "react";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import { Link } from "react-router-dom";
import UserAuthContext from "../auth/UserAuthContext";
import FirebaseContext from "../util/FirebaseContext";
import CheckIcon from "@material-ui/icons/Check";
import ClearIcon from "@material-ui/icons/Clear";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function InviteCard({ orgID }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState();
  const [org, setOrg] = useState();

  const [memberRef, setMemberRef] = useState();

  console.log("Trying to get org data", db, orgID);

  useEffect(() => {
    console.log(db, orgID);
    if (!db || !orgID) {
      return;
    }

    return db
      .collection("organizations")
      .doc(orgID)
      .onSnapshot((doc) => setOrg(doc.data()));
  }, [db, orgID]);

  useEffect(() => {
    if (!db || !orgID || !oauthClaims || !oauthClaims.email) {
      return;
    }
    setMemberRef(
      db
        .collection("organizations")
        .doc(orgID)
        .collection("members")
        .doc(oauthClaims.email)
    );
  }, [db, orgID, oauthClaims]);

  const onAccept = useCallback(
    (e) => {
      if (!oauthClaims || !oauthClaims.email) {
        return;
      }

      return memberRef.update({
        email: oauthClaims.email,
        displayName: oauthClaims.name || "",
        photoURL: oauthClaims.picture || "",
        invited: false,
        active: true,
        joinedTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    },
    [memberRef, oauthClaims, firebase]
  );

  const onIgnore = (e) => {
    setIgnoreDialogOpen(true);
  };

  if (!org) {
    return <></>;
  }

  const linkedTitle = orgID && org.name && (
    <Link style={{ color: "black" }} to={`/orgs/${orgID}`}>
      {org.name}
    </Link>
  );

  return (
    <>
      <Dialog
        open={ignoreDialogOpen}
        onClose={() => setIgnoreDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Ignore invite to {org.name}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This is an irreversible action. An administrator will have to invite
            you again, if you want to join the organization.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setIgnoreDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              memberRef.delete().then(() => {
                setIgnoreDialogOpen(false);
              });
            }}
            color="secondary"
            autoFocus
          >
            Ignore
          </Button>
        </DialogActions>
      </Dialog>
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
    </>
  );
}
