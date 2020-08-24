import React, { useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function UploadVideoDialog({ open, setOpen }) {
  const [files, setFiles] = useState();

  const cancel = () => {
    setOpen(false);
  };

  console.log("Upload video dialog", open);

  const onDrop = (files) => {
    setFiles(files);
  };

  console.log(files);

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="upload-dialog-title"
      aria-describedby="upload-dialog-description"
    >
      <DialogTitle id="upload-dialog-title">
        Upload video for transcription
      </DialogTitle>
      <DialogContent>
        <input
          accept="video/*,audio/*"
          style={{ display: "none" }}
          id="raised-button-file"
          multiple
          type="file"
          onChange={(e) => {
            console.log(e.target);
          }}
        />
        <label htmlFor="raised-button-file">
          <Button variant="raised" component="span">
            Select video or audio file
          </Button>
        </label>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button disabled color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
