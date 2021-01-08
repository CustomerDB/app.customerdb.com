import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import React, { useContext } from "react";
import UserAuthContext from "../auth/UserAuthContext";
import Grid from "@material-ui/core/Grid";
import CollabEditor from "../editor/CollabEditor.js";
import useFirestore from "../db/Firestore.js";

// SummaryEditor augments a collaborative editor with embedded item previews.
export default function SummaryEditor({ reactQuillRef }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { summaryRef } = useFirestore();

  if (!summaryRef) {
    return <></>;
  }

  return (
    <Grid container item xs={12} style={{ position: "relative" }} spacing={0}>
      <CollabEditor
        authorID={oauthClaims.user_id}
        authorName={oauthClaims.name}
        quillRef={reactQuillRef}
        revisionsRef={summaryRef.collection("revisions")}
        deltasRef={summaryRef.collection("deltas")}
        cursorsRef={summaryRef.collection("cursors")}
        id="quill-summary-editor"
        theme="snow"
        placeholder="Start typing here"
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
            // delay: 2000,
            // maxStack: 500,
            userOnly: true,
          },
        }}
      />
    </Grid>
  );
}
