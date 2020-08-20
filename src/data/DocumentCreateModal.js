import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";
import TagGroupSelector from "./TagGroupSelector.js";
import TemplateSelector from "./TemplateSelector.js";

import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

export default function DocumentCreateModal({ show, onHide, editor }) {
  const [name, setName] = useState();
  const { documentRef } = useFirestore();

  useEffect(() => {
    if (!documentRef) return;

    documentRef.get().then((snapshot) => {
      let data = snapshot.data();
      data.ID = snapshot.id;
      setName(data.name);
    });
  }, [show, documentRef]);

  const onSave = () => {
    if (!documentRef) {
      return;
    }

    documentRef.set(
      {
        name: name,
        needsIndex: true,
      },
      { merge: true }
    );
    onHide();
  };

  return (
    <Dialog
      open={show}
      onClose={onHide}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`New document`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Set document name, tag group, and template.
        </DialogContentText>
        <TextField
          autofocus
          margin="dense"
          id="name"
          label="Document name"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") onSave();
          }}
        />
        <TagGroupSelector />
        <TemplateSelector editor={editor} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onSave}>Continue</Button>
      </DialogActions>
    </Dialog>
  );
}
