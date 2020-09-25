import React, { useState } from "react";

import AvatarEdit from "react-avatar-edit";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
  },
  wrapper: {
    margin: theme.spacing(1),
    position: "relative",
  },
}));

export default function ImageDialog({ open, setOpen }) {
  const classes = useStyles();

  const [imageSource, setImageSource] = useState();

  const { personRef } = useFirestore();

  const onSave = () => {
    console.log("onSave");

    personRef.set({ imageData: imageSource }, { merge: true });

    setOpen(false);
    setImageSource();
  };

  const cancel = () => {
    setOpen(false);
  };

  const onCrop = (preview) => {
    setImageSource(preview);
  };

  const onClose = () => {
    setImageSource();
  };

  const onBeforeFileLoad = () => {};

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="image-dialog-title"
      aria-describedby="image-dialog-description"
    >
      <DialogTitle id="image-dialog-title">Upload and crop photo</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid container item>
            <Grid item xs={12}>
              <AvatarEdit
                width={390}
                height={295}
                onCrop={onCrop}
                onClose={onClose}
                onBeforeFileLoad={onBeforeFileLoad}
                src={imageSource}
              />
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>

        <div className={classes.wrapper}>
          <Button
            variant="contained"
            color="primary"
            disabled={imageSource === undefined}
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  );
}
