import React, { useContext } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import UserAuthContext from "../auth/UserAuthContext.js";
import FirebaseContext from "../util/FirebaseContext.js";
import { useParams, useNavigate } from "react-router-dom";
import event from "../analytics/event.js";
import Button from "@material-ui/core/Button";

export default function TagGroupDeleteDialog({
  tagGroupRef,
  open,
  setOpen,
  tagGroup,
}) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const navigate = useNavigate();

  const cancel = () => {
    console.debug("user canceled tag group archive");
    setOpen(false);
  };

  const archive = () => {
    if (
      !tagGroupRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !tagGroup ||
      !tagGroup.ID
    ) {
      setOpen(false);
      return;
    }

    console.debug("archiving tag group");

    event(firebase, "delete_tag_group", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    tagGroupRef.update({
      deletedBy: oauthClaims.email,
      deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this tag group?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this tag group for deletion. This tag group will no longer be
          visible and will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
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
