import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function AlertDialog({ open, setOpen, document }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { documentsRef } = useFirestore();
  const navigate = useNavigate();

  const cancel = () => {
    setOpen(false);
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

    event(firebase, "delete_interview", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    documentsRef
      .doc(document.ID)
      .update({
        deletedBy: oauthClaims.email,
        deletionTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        navigate(`/orgs/${orgID}/interviews`);
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
      <DialogTitle id="alert-dialog-title">{`Archive this interview?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this interview for deletion. This interview will no longer be
          visible and will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
          id="archive-document-dialog-button"
          onClick={archive}
          variant="contained"
          color="secondary"
          autoFocus
        >
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
