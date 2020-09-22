import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import TemplateSelector from "./TemplateSelector.js";
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
      <DialogTitle id="alert-dialog-title">{`New interview from guide`}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
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
