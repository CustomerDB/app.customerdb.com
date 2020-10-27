import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { useDropzone } from "react-dropzone";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

export default function TranscriptDropzone({ setUploading, setProgress }) {
  let { oauthClaims } = useContext(UserAuthContext);
  let { orgID, documentID } = useParams();
  const firebase = useContext(FirebaseContext);

  let uploadTask = useRef();

  let storageRef = firebase.storage().ref();

  const { transcriptionsRef, documentsRef } = useFirestore();

  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState();
  const [error, setError] = useState();

  const confirmation = (e) => {
    var confirmationMessage =
      "Video is currently uploading. Do you want to cancel?";
    (e || window.event).returnValue = confirmationMessage; //Gecko + IE
    return confirmationMessage; //Gecko + Webkit, Safari, Chrome etc.
  };

  const addEventListener = () => {
    console.log("Add event listener");
    window.addEventListener("beforeunload", confirmation);
  };

  const removeEventListener = () => {
    console.log("Remove event listener");
    window.removeEventListener("beforeunload", confirmation);
  };

  useEffect(() => {
    if (!file) {
      console.log("File not available");
      return;
    }

    setUploading(true);

    // Store name, speaker count and path in operation document.
    let transcriptionID = uuidv4();

    // TODO: Find official google storage rules for allowed object names.
    let fileName = file.name.replace(/[ !@#$%^&*()+[]{}<>]/g, "-");

    let storagePath = `${orgID}/transcriptions/${transcriptionID}/input/${fileName}`;
    transcriptionsRef
      .doc(transcriptionID)
      .set({
        ID: transcriptionID,
        speakers: 3,
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
            setError(error);
            setUploading(false);
            removeEventListener();
          },
          () => {
            // 100% Done
            console.debug("Completed");
            setUploading(false);
            removeEventListener();

            // Create pending document
            documentsRef.doc(documentID).update({
              pending: true,
              transcription: transcriptionID,
            });
          }
        );
      });
  }, [file]);

  const onDrop = useCallback((acceptedFiles) => {
    // Do something with the files
    console.log("Should start uploading ", acceptedFiles);
    console.log(acceptedFiles[0]);
    setFile(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
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
      <CloudUploadIcon size={70} />
      {isDragActive ? (
        <p>Drop the videos here ...</p>
      ) : (
        <p>Drag 'n' drop some videos here, or click to select files</p>
      )}
    </div>
  );
}
