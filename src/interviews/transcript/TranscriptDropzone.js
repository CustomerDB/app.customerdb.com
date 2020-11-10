import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import Button from "@material-ui/core/Button";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import FirebaseContext from "../../util/FirebaseContext.js";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputAdornment from "@material-ui/core/InputAdornment";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import TheatersIcon from "@material-ui/icons/Theaters";
import UserAuthContext from "../../auth/UserAuthContext.js";
import { useDropzone } from "react-dropzone";
import useFirestore from "../../db/Firestore.js";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function TranscriptDropzone({
  setUploading,
  setProgress,
  setError,
  setCancelUpload,
}) {
  let { oauthClaims } = useContext(UserAuthContext);
  let { orgID, documentID } = useParams();

  const [speakers, setSpeakers] = useState(2);
  const firebase = useContext(FirebaseContext);

  let uploadTask = useRef();

  let storageRef = firebase.storage().ref();

  const { transcriptionsRef, documentsRef } = useFirestore();

  const [file, setFile] = useState();
  const [startUpload, setStartUpload] = useState(false);

  const confirmation = (e) => {
    var confirmationMessage =
      "Video is currently uploading. Do you want to cancel?";
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  };

  useEffect(() => {
    if (!startUpload) {
      return;
    }

    if (!file) {
      console.debug("File not available");
      return;
    }

    setUploading(true);

    // Store name, speaker count and path in operation document.
    let transcriptionID = uuidv4();

    // TODO: Find official google storage rules for allowed object names.
    let fileName = file.name.replace(/[ !@#$%^&*()+[]{}<>]/g, "-");

    const addEventListener = () => {
      console.debug("Add event listener");
      window.addEventListener("beforeunload", confirmation);
    };

    const removeEventListener = () => {
      console.debug("Remove event listener");
      window.removeEventListener("beforeunload", confirmation);
    };

    let storagePath = `${orgID}/transcriptions/${transcriptionID}/input/${fileName}`;
    transcriptionsRef
      .doc(transcriptionID)
      .set({
        ID: transcriptionID,
        speakers: speakers,
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
        inputPath: storagePath,
        thumbnailToken: "",
        orgID: orgID,
        documentID: documentID,
      })
      .then(() => {
        uploadTask.current = storageRef.child(storagePath).put(file, {});
        setError();

        setCancelUpload(() => {
          if (uploadTask.current) {
            uploadTask.current.cancel();
          }
        });

        addEventListener();

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
            console.log(error);
            setError("Upload failed");
            setUploading(false);
            removeEventListener();
            uploadTask.current = undefined;
          },
          () => {
            // 100% Done
            console.debug("Completed");
            setUploading(false);
            removeEventListener();
            uploadTask.current = undefined;

            // Create pending document
            // TODO(NN): Move this to a cloud function.
            documentsRef.doc(documentID).update({
              pending: true,
              transcription: transcriptionID,
            });
          }
        );
      });
  }, [
    file,
    documentID,
    documentsRef,
    firebase.firestore.FieldValue,
    oauthClaims.email,
    orgID,
    setCancelUpload,
    setError,
    setProgress,
    setUploading,
    storageRef,
    transcriptionsRef,
    startUpload,
    speakers,
  ]);

  const onDrop = useCallback((acceptedFiles) => {
    // Do something with the files
    console.log("Should start uploading ", acceptedFiles);
    console.log(acceptedFiles[0]);
    setFile(acceptedFiles[0]);
  }, []);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    fileRejections,
  } = useDropzone({ onDrop, accept: "video/*, audio/*" });

  const maxSpeakers = 6;

  return (
    <>
      {!file && (
        <>
          <div
            {...getRootProps()}
            style={{
              textAlign: "center",
              paddingTop: "4rem",
              paddingBottom: "4rem",
              marginTop: "2rem",
              backgroundColor: "#f7f7f7",
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon fontSize="large" />
            {isDragActive ? (
              <p>Drop the video here ...</p>
            ) : (
              <p>
                Drag 'n' drop a video here to transcribe, or click to select
                video file
              </p>
            )}

            {fileRejections.length !== 0 && (
              <p>Please select a valid video or audio file</p>
            )}
          </div>
        </>
      )}
      {file && (
        <Grid container justify="center">
          <Grid container xs={10}>
            <Grid
              container
              item
              alignItems="center"
              style={{ marginTop: "1rem" }}
            >
              <TextField
                style={{ width: "100%" }}
                id="fileName"
                label="Outlined"
                variant="outlined"
                disabled
                value={file.name}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TheatersIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid container item style={{ marginTop: "1rem" }}>
              <FormControl variant="outlined" style={{ width: "100%" }}>
                <InputLabel id="speaker-label">Speakers</InputLabel>
                <Select
                  labelId="speaker-label"
                  id="speaker"
                  value={speakers}
                  onChange={(e) => setSpeakers(e.target.value)}
                  label="speakers"
                >
                  {[...Array(maxSpeakers).keys()].map((i) => (
                    <MenuItem value={i + 1}>{i + 1}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              container
              item
              alignItems="center"
              justify="flex-end"
              style={{ marginTop: "2rem" }}
            >
              <Button
                variant="contained"
                style={{ marginRight: "1rem" }}
                onClick={() => setFile()}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setStartUpload(true);
                }}
              >
                Upload
              </Button>
            </Grid>
          </Grid>
        </Grid>
      )}
    </>
  );
}
