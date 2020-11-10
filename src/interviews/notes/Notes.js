import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import Grid from "@material-ui/core/Grid";
import HighlightCollabEditor from "../../editor/HighlightCollabEditor.js";
import React from "react";
import useFirestore from "../../db/Firestore.js";

// Notes augments a collaborative editor with tags and text highlights.
export default function Notes({ reactQuillRef, tags, document }) {
  const { documentRef, highlightsRef } = useFirestore();

  if (!documentRef || !highlightsRef) {
    return <></>;
  }

  return (
    <Grid container item xs={12} style={{ position: "relative" }} spacing={0}>
      <HighlightCollabEditor
        quillRef={reactQuillRef}
        document={document}
        revisionsRef={documentRef.collection("revisions")}
        deltasRef={documentRef.collection("deltas")}
        highlightsRef={highlightsRef}
        tags={tags}
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
  );
}
