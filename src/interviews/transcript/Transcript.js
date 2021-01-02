import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import React, { useContext, useEffect, useRef, useState } from "react";

import Alert from "@material-ui/lab/Alert";
import Button from "@material-ui/core/Button";
import FirebaseContext from "../../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import HighlightCollabEditor from "../../editor/HighlightCollabEditor.js";
import LinearProgress from "@material-ui/core/LinearProgress";
import Moment from "react-moment";
import PlayheadBlot from "./PlayheadBlot.js";
import Quill from "quill";
import SpeakerBlot from "./SpeakerBlot.js";
import Speakers from "./Speakers.js";
import Step from "@material-ui/core/Step";
import StepLabel from "@material-ui/core/StepLabel";
import Stepper from "@material-ui/core/Stepper";
import TranscriptDropzone from "./TranscriptDropzone.js";
import useFirestore from "../../db/Firestore.js";
import Divider from "@material-ui/core/Divider";

import CallDetails from "../CallDetails.js";

Quill.register("formats/playhead", PlayheadBlot);
Quill.register("formats/speaker", SpeakerBlot);

function PageContainer({ children }) {
  return (
    <Grid item xs={12} style={{ position: "relative" }}>
      {children}
    </Grid>
  );
}

// Transcript augments a collaborative editor with tags, text highlights and video integration.
export default function Transcript({
  authorName,
  reactQuillRef,
  tags,
  document,
  selectionChannelPort,
  suggestionsOpen,
  setSuggestionsOpen,
  setHasSuggestions,
}) {
  const {
    documentRef,
    transcriptHighlightsRef,
    transcriptionsRef,
  } = useFirestore();

  const firebase = useContext(FirebaseContext);
  const { callsRef } = useFirestore();
  const [call, setCall] = useState();
  const [operation, setOperation] = useState();
  const [eta, setEta] = useState();
  const [transcriptionProgress, setTranscriptionProgress] = useState();
  const [uploadProgress, setUploadProgress] = useState();
  const [uploading, setUploading] = useState();
  const editorContainerRef = useRef();

  // progress type can be "call" or "upload" to show the stepper and progress for either.
  // If not set, no progress is shown and document is rendered.
  const [progressType, setProgressType] = useState();
  const [activeStep, setActiveStep] = useState();
  const [error, setError] = useState();
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);

  const cancelUpload = useRef();

  // onChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const onChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }
    console.debug("selectionChannelPort: sending", range);
    selectionChannelPort.postMessage(range);
  };

  useEffect(() => {
    if (!callsRef || !document.callID) {
      return;
    }
    return callsRef.doc(document.callID).onSnapshot((doc) => {
      let callData = doc.data();
      if (callData.deletionTimestamp !== "") {
        setCall();
        return;
      }
      setCall(doc.data());
    });
  }, [callsRef, document.callID]);

  useEffect(() => {
    console.log("Getting operation");
    if (!transcriptionsRef || !document.transcription) {
      return;
    }

    return transcriptionsRef.doc(document.transcription).onSnapshot((doc) => {
      if (!doc.exists) {
        setOperation();
        setError();
        setTranscriptionFailed(false);
        return;
      }

      let operation = doc.data();

      setOperation(operation);
      if (operation.status === "failed") {
        setTranscriptionFailed(true);
        setError("Transcription failed");
      }

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

  useEffect(() => {
    if (call && call.callStartedTimestamp) {
      setProgressType("call");
      setActiveStep(0);

      if (call.callEndedTimestamp) {
        setActiveStep(1);
      }

      if (operation) {
        setActiveStep(2);

        if (!document.pending) {
          // Remove progress
          setProgressType();
        }
      }
    } else {
      setProgressType("upload");
      setActiveStep(0);

      if (operation) {
        setActiveStep(1);

        if (!document.pending) {
          // Remove progress
          setProgressType();
        }
      }
    }
  }, [call, document, operation]);

  if (!documentRef) {
    return <></>;
  }

  let callNotStarted = !call || (call && call.callStartedTimestamp === "");
  let transcriptionNotStarted = !operation;

  if (callNotStarted && transcriptionNotStarted && !uploading) {
    return (
      <PageContainer>
        <CallDetails
          document={document}
          isDisabled={(call) => {
            return !!(document.transcription || call.callEndedTimestamp);
          }}
        />

        <Divider />

        <TranscriptDropzone
          setProgress={setUploadProgress}
          setUploading={setUploading}
          setError={setError}
          setCancelUpload={(cancel) => {
            cancelUpload.current = cancel;
          }}
        />
      </PageContainer>
    );
  }

  let progress;
  if (uploading) {
    if (uploadProgress) {
      progress = (
        <>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <i>Uploading video</i>
        </>
      );
    } else {
      progress = (
        <>
          <LinearProgress />
          <i>Uploading video</i>
        </>
      );
    }
  } else if (transcriptionProgress) {
    progress = (
      <>
        <LinearProgress variant="determinate" value={transcriptionProgress} />
        <i>
          {eta && (
            <>
              Estimated completion <Moment fromNow date={eta} />
            </>
          )}
        </i>
      </>
    );
  } else {
    progress = <LinearProgress />;
  }

  const deleteTranscript = firebase
    .functions()
    .httpsCallable("transcript-deleteTranscript");

  let cancelTranscriptionButton = (
    <div style={{ paddingTop: "2rem" }}>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => {
          deleteTranscript({ documentID: document.ID }).then(() => {
            setError();

            if (cancelUpload.current) {
              console.log("Cancel upload");
              cancelUpload.current();
              cancelUpload.current = undefined;
            }
          });
        }}
      >
        Cancel
      </Button>
    </div>
  );

  if (progressType === "call") {
    return (
      <PageContainer>
        <Stepper activeStep={activeStep}>
          <Step key={0}>
            <StepLabel>Recording call</StepLabel>
          </Step>
          <Step key={1}>
            <StepLabel>Preparing video</StepLabel>
          </Step>
          <Step key={2}>
            <StepLabel error={transcriptionFailed}>
              Transcribing video
            </StepLabel>
          </Step>
        </Stepper>
        {error ? <Alert severity="error">{error}</Alert> : progress}
      </PageContainer>
    );
  }

  if (progressType === "upload") {
    return (
      <PageContainer>
        <Stepper activeStep={activeStep}>
          <Step key={0}>
            <StepLabel>Uploading video</StepLabel>
          </Step>
          <Step key={1}>
            <StepLabel error={transcriptionFailed}>
              Transcribing video
            </StepLabel>
          </Step>
        </Stepper>
        {error ? <Alert severity="error">{error}</Alert> : progress}
        {cancelTranscriptionButton}
      </PageContainer>
    );
  }

  return (
    <>
      <Grid
        ref={editorContainerRef}
        container
        item
        xs={12}
        style={{ position: "relative" }}
        spacing={0}
      >
        <HighlightCollabEditor
          authorName={authorName}
          quillRef={reactQuillRef}
          document={document}
          revisionsRef={documentRef.collection("transcriptRevisions")}
          deltasRef={documentRef.collection("transcriptDeltas")}
          highlightsRef={transcriptHighlightsRef}
          suggestionsRef={documentRef.collection("transcriptSuggestions")}
          cursorsRef={documentRef.collection("transcriptCursors")}
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
            history: {
              userOnly: true,
            },
          }}
          suggestionsOpen={suggestionsOpen}
          setSuggestionsOpen={setSuggestionsOpen}
          setHasSuggestions={setHasSuggestions}
        />
        <Speakers
          quillRef={reactQuillRef}
          editorContainerRef={editorContainerRef}
          transcriptionID={document.transcription}
        />
      </Grid>
    </>
  );
}
