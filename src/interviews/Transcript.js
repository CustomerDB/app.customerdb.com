import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import HighlightCollabEditor from "../editor/HighlightCollabEditor.js";
import LinearProgress from "@material-ui/core/LinearProgress";
import Moment from "react-moment";
import PlayheadBlot from "./PlayheadBlot.js";
import Quill from "quill";
import UploadVideoDialog from "./UploadVideoDialog.js";
import useFirestore from "../db/Firestore.js";

Quill.register("formats/playhead", PlayheadBlot);

// Transcript augments a collaborative editor with tags, text highlights and video integration.
export default function Transcript({
  reactQuillRef,
  tags,
  document,
  setCurrentSelectionCallback,
}) {
  const {
    documentRef,
    transcriptHighlightsRef,
    transcriptionsRef,
  } = useFirestore();

  const [transcriptionProgress, setTranscriptionProgress] = useState();
  const [operation, setOperation] = useState();
  const [uploadModalShow, setUploadModalShow] = useState(false);
  const [eta, setEta] = useState();

  // onChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const onChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }

    console.debug("current selection range", range);
    setCurrentSelectionCallback(range);
  };

  useEffect(() => {
    console.log("Getting operation");
    if (!transcriptionsRef || !document.transcription) {
      return;
    }

    return transcriptionsRef.doc(document.transcription).onSnapshot((doc) => {
      let operation = doc.data();
      setOperation(operation);
      if (operation.progress) {
        setTranscriptionProgress(operation.progress);

        let startDate = operation.creationTimestamp.toDate();
        let now = Date.now();
        let elapsed = now - startDate;
        let totalTime = (elapsed / operation.progress) * 100;
        let _eta = new Date();
        _eta.setTime(startDate.getTime() + totalTime);
        setEta(_eta);
      }
    });
  }, [transcriptionsRef, document.transcription]);

  if (!operation) {
    return (
      <Grid
        item
        xs={12}
        style={{
          position: "relative",
          textAlign: "center",
          paddingTop: "2rem",
        }}
      >
        <Button
          variant="contained"
          color="secondary"
          onClick={() => {
            setUploadModalShow(true);
          }}
        >
          Upload interview video to transcribe
        </Button>
        <UploadVideoDialog
          open={uploadModalShow}
          setOpen={(value) => {
            setUploadModalShow(value);
          }}
        />
      </Grid>
    );
  }

  if (!documentRef) {
    return <></>;
  }

  return (
    <>
      {document.pending ? (
        <Grid item xs={12} style={{ position: "relative" }}>
          <p>
            <i>
              Transcribing video.{" "}
              {eta && (
                <>
                  Estimated completion <Moment fromNow date={eta} />
                </>
              )}
            </i>
          </p>
          {transcriptionProgress ? (
            <LinearProgress
              variant="determinate"
              value={transcriptionProgress}
            />
          ) : (
            <LinearProgress />
          )}
        </Grid>
      ) : (
        <Grid item xs={12} style={{ position: "relative" }} spacing={0}>
          <HighlightCollabEditor
            quillRef={reactQuillRef}
            document={document}
            revisionsRef={documentRef.collection("transcriptRevisions")}
            deltasRef={documentRef.collection("transcriptDeltas")}
            highlightsRef={transcriptHighlightsRef}
            tags={tags}
            onChangeSelection={onChangeSelection}
            id="quill-notes-editor"
            theme="snow"
            placeholder="Start typing here and select to mark highlights"
            modules={{
              toolbar: [
                [{ header: [1, 2, false] }],
                ["bold", "italic", "underline", "strike", "blockquote"],
                [
                  { list: "ordered" },
                  { list: "bullet" },
                  { indent: "-1" },
                  { indent: "+1" },
                ],
                ["link", "image"],
                ["clean"],
              ],
            }}
          />
        </Grid>
      )}
    </>
  );
}
