import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import TagGroupSelector from "./TagGroupSelector.js";
import TemplateSelector from "./TemplateSelector.js";
import TextField from "@material-ui/core/TextField";
import useFirestore from "../db/Firestore.js";

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
        <Grid container spacing={2}>
          <Grid container item>
            <Grid item xs={12}>
              <TextField
                autofocus
                margin="dense"
                variant="outlined"
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
            </Grid>
          </Grid>
          <Grid container item>
            <Grid item xs={12}>
              <TagGroupSelector />
            </Grid>
          </Grid>
          <Grid container item>
            <Grid item xs={12}>
              <TemplateSelector editor={editor} />
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onSave}>Continue</Button>
      </DialogActions>
    </Dialog>
  );
}
