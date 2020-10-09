import React, { useContext, useState } from "react";

import AvatarEdit from "react-avatar-edit";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

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
  const { orgID, personID } = useParams();

  const { personRef } = useFirestore();
  const firebase = useContext(FirebaseContext);
  let storageRef = firebase.storage().ref();

  const onSave = () => {
    console.log("onSave");

    // Upload image
    let storagePath = `${orgID}/avatars/${personID}/avatar.png`;
    let imageRef = storageRef.child(storagePath);
    let task = imageRef.putString(imageSource, "data_url");
    task.on(
      "state_changed",
      (snapshot) => {
        console.log((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      (error) => {
        console.error(error);
      },
      () => {
        // 100% Done
        imageRef.getDownloadURL().then((url) => {
          personRef
            .set(
              {
                imageURL: url,
              },
              { merge: true }
            )
            .then(() => {
              setOpen(false);
              setImageSource();
            });
        });
      }
    );
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
