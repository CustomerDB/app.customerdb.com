import React, { useContext, useState } from "react";
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
import LinearProgress from "@material-ui/core/LinearProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

const { v4: uuidv4 } = require("uuid");

export default function InviteCard({ orgID, orgName, setRerender }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(true);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState();

  const linkedTitle = orgID && orgName && (
    <Link style={{ color: "black" }} to={`/orgs/${orgID}`}>
      {orgName}
    </Link>
  );

  const onAccept = (e) => {
    setLoading(true);

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
        setShow(false);
        setRerender(uuidv4());
      })
      .catch((err) => {
        setLoading(false);
        console.error(err);
      });
  };

  const onIgnore = (e) => {
    setIgnoreDialogOpen(true);
  };

  if (!show) {
    return <></>;
  }

  return (
    <>
      <Dialog
        open={ignoreDialogOpen}
        onClose={() => setIgnoreDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Ignore invite to {orgName}
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
              setLoading(true);
              const ignoreInviteFunc = firebase
                .functions()
                .httpsCallable("auth-ignoreInvite");

              ignoreInviteFunc({ orgID: orgID })
                .then(() => {
                  setShow(false);
                  setRerender(uuidv4());
                })
                .catch((err) => {
                  setLoading(false);
                  console.error(err);
                });

              setIgnoreDialogOpen(false);
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
          {loading && <LinearProgress />}
          <CardActions>
            <Button
              startIcon={<ClearIcon />}
              size="small"
              variant="contained"
              onClick={onIgnore}
              disabled={loading}
            >
              Ignore
            </Button>
            <Button
              startIcon={<CheckIcon />}
              size="small"
              color="secondary"
              variant="contained"
              onClick={onAccept}
              disabled={loading}
            >
              Accept
            </Button>
          </CardActions>
        </CardContent>
      </Card>
    </>
  );
}
