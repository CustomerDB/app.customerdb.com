import React, { useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";

export default function UploadVideoDialog({ open, setOpen }) {
  const [file, setFile] = useState();
  const [name, setName] = useState();

  const cancel = () => {
    setOpen(false);
  };

  console.log("Upload video dialog", open);

  const onChange = (e) => {
    setFile(e.target.files[0]);
  };

  console.log(file);

  const onSave = () => {};

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="upload-dialog-title"
      aria-describedby="upload-dialog-description"
      fullWidth={true}
      maxWidth="md"
    >
      <DialogTitle id="upload-dialog-title">
        Upload video for transcription
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid container item>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                id="name"
                label="Name"
                fullWidth
                value={name}
                margin="dense"
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                accept="video/*,audio/*"
                style={{ display: "none" }}
                id="raised-button-file"
                multiple
                type="file"
                onChange={onChange}
              />
              <label htmlFor="raised-button-file">
                <Button variant="raised" component="span">
                  {file ? file.name : "Select video or audio file"}
                </Button>
              </label>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button disabled color="primary">
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
