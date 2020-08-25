import React, { useContext, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import CircularProgress from "@material-ui/core/CircularProgress";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import UserAuthContext from "../auth/UserAuthContext.js";
import { green } from "@material-ui/core/colors";
import { makeStyles } from "@material-ui/core/styles";
import { nanoid } from "nanoid";
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
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

let storageRef = window.firebase.storage().ref();

export default function UploadVideoDialog({ open, setOpen }) {
  const classes = useStyles();

  let { oauthClaims } = useContext(UserAuthContext);
  let { orgID } = useParams();

  let uploadTask = useRef();

  const navigate = useNavigate();
  const { transcriptionsRef, documentsRef } = useFirestore();

  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState();
  const [file, setFile] = useState();
  const [name, setName] = useState();
  const [speakers, setSpeakers] = useState(2);
  const [error, setError] = useState();

  const cancel = () => {
    setFile();
    setName();
    setSpeakers(2);
    setUploading(false);

    if (uploadTask.current) {
      uploadTask.current.cancel();
    }

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

  const startUpload = () => {
    if (!file) {
      return;
    }

    setUploading(true);

    // Store name, speaker count and path in operation document.
    let transcriptionID = nanoid();

    // TODO: Find official google storage rules for allowed object names.
    let fileName = file.name.replace(/[ !@#$%^&*()+[]{}<>]/g, "-");

    let storagePath = `${orgID}/transcriptions/${transcriptionID}/input/${fileName}`;
    transcriptionsRef
      .doc(transcriptionID)
      .set({
        ID: transcriptionID,
        name: name,
        speakers: speakers,
        createdBy: oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
        destination: storagePath,
        orgID: orgID,
      })
      .then(() => {
        uploadTask.current = storageRef.child(storagePath).put(file, {});

        uploadTask.current.on(
          "state_changed",
          (snapshot) => {
            setProgress(
              Math.floor(
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              )
            );
          },
          (error) => {
            // Handle unsuccessful uploads
            setError(error);
            setUploading(false);
          },
          () => {
            // 100% Done
            console.log("Completed");
            setUploading(false);
            setSuccess(true);

            // Create pending document
            let documentID = nanoid();
            documentsRef
              .doc(documentID)
              .set({
                ID: documentID,
                name: name,
                createdBy: oauthClaims.email,
                creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                tagGroupID: "",
                templateID: "",
                needsIndex: false,
                deletionTimestamp: "",
                pending: true,
                transcription: transcriptionID,
              })
              .then(() => {
                navigate(`/orgs/${orgID}/data/${documentID}`);
                cancel();
              });
          }
        );
      });
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
          {error ? (
            <Grid container item>
              <Grid item>
                <Alert severity="error">{error}</Alert>
              </Grid>
            </Grid>
          ) : (
            <></>
          )}
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
            disabled={uploading || !file || !name || !speakers}
            onClick={startUpload}
          >
            {success ? "Continue" : "Upload"}
          </Button>
          {uploading && (
            <CircularProgress
              variant="static"
              size={24}
              value={progress}
              className={classes.buttonProgress}
            />
          )}
        </div>
      </DialogActions>
    </Dialog>
  );
}
