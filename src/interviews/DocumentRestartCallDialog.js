import "firebase/firestore";

import React, { useContext, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FirebaseContext from "../util/FirebaseContext.js";
import LinearProgress from "@material-ui/core/LinearProgress";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function DocumentRestartCallDialog({ open, setOpen, document }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { documentsRef } = useFirestore();
  const [deleting, setDeleting] = useState(false);

  const deleteTranscript = firebase
    .functions()
    .httpsCallable("transcript-deleteTranscript");

  const cancel = () => {
    setOpen(false);
    setDeleting(false);
  };

  const archive = () => {
    if (
      !documentsRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !document ||
      !document.ID
    ) {
      setOpen(false);
      return;
    }

    event(firebase, "restart_call", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    setDeleting(true);

    deleteTranscript({ documentID: document.ID }).then(() => {
      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        Delete existing call recording and transcript
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Delete the existing call recording and transcript. You and your guests
          will be able to join this call again, and the new recording and
          transcript will replace what's here now. This is an irreversible
          action.
        </DialogContentText>
        {deleting && <LinearProgress />}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
          id="delete-transcript-dialog-button"
          onClick={archive}
          variant="contained"
          color="secondary"
          autoFocus
          disabled={deleting}
        >
          Restart call
        </Button>
      </DialogActions>
    </Dialog>
  );
}
