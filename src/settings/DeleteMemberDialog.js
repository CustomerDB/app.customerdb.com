import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function DeleteMemberDialog(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.member !== undefined) {
      setName(props.member.displayName);
    }
  }, [props.member]);

  return (
    <Dialog
      open={props.show}
      onClose={props.onHide}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this tag group?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Are you sure you want to delete{" "}
          <b>{name !== undefined ? name : "member"}</b>?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onHide} color="primary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onDelete(props.member.email);
            props.onHide();
          }}
          variant="contained"
          color="secondary"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
