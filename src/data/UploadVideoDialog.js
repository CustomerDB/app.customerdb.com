import React, { useState } from "react";

import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import clsx from "clsx";
import { green } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
  },
  wrapper: {
    margin: theme.spacing(1),
    position: "relative",
  },
  buttonSuccess: {
    backgroundColor: green[500],
    "&:hover": {
      backgroundColor: green[700],
    },
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

export default function UploadVideoDialog({ open, setOpen }) {
  const classes = useStyles();

  const [uploading, setUploading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const [file, setFile] = useState();
  const [name, setName] = useState();
  const [speakers, setSpeakers] = useState(1);

  const cancel = () => {
    setFile();
    setName();
    setSpeakers(1);
    setUploading(false);
    setOpen(false);
  };

  console.log("Upload video dialog", open);

  const onChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSpeakerChange = (e) => {
    setSpeakers(e.target.value);
  };

  console.log(file);

  const buttonClassname = clsx({
    [classes.buttonSuccess]: success,
  });

  const startUpload = () => {
    setUploading(true);

    // Store name, speaker count and path in operation document.
  };

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
        <Grid container spacing={2}>
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
          </Grid>
          <Grid container item>
            <Grid item xs={12}>
              <FormControl variant="outlined" style={{ width: "10rem" }}>
                <InputLabel id="speaker-label">Speakers</InputLabel>
                <Select
                  labelId="speaker-label"
                  id="speaker"
                  value={speakers}
                  onChange={handleSpeakerChange}
                  label="speakers"
                >
                  <MenuItem value={1}>1</MenuItem>
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={4}>4</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container item>
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

        <div className={classes.wrapper}>
          <Button
            variant="contained"
            color="primary"
            className={buttonClassname}
            disabled={uploading || !file || !name || !speakers}
            onClick={startUpload}
          >
            Upload
          </Button>
          {uploading && (
            <CircularProgress size={24} className={classes.buttonProgress} />
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}
