import React, { useContext, useEffect, useState } from "react";
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

export default function PersonDeleteDialog(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [person, setPerson] = useState();

  useEffect(() => {
    if (!props.personRef) {
      return;
    }

    props.personRef.get().then((doc) => {
      let person = doc.data();
      person.ID = doc.id;
      setPerson(person);
    });
  }, [props.show, props.personRef]);

  if (!person) {
    return <></>;
  }

  return (
    <Dialog
      open={props.show}
      onClose={props.onHide}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Delete person</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Do you want to mark <b>{person.name}</b> for deletion? This person
          will no longer be visible and will be permanently deleted after thirty
          days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onHide} color="primary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            event(firebase, "delete_person", {
              orgID: orgID,
              userID: oauthClaims.user_id,
            });
            props.personRef.update({
              deletedBy: oauthClaims.email,
              deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            navigate(`/orgs/${orgID}/people`);
          }}
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
