// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import "react-quill/dist/quill.snow.css";
import "firebase/firestore";

import Grid from "@material-ui/core/Grid";
import HighlightCollabEditor from "../../editor/HighlightCollabEditor.js";
import React from "react";
import useFirestore from "../../db/Firestore.js";

// Notes augments a collaborative editor with tags and text highlights.
export default function Notes({
  authorID,
  authorName,
  reactQuillRef,
  tags,
  document,
  suggestionsOpen,
  setSuggestionsOpen,
  setHasSuggestions,
}) {
  const { documentRef, highlightsRef } = useFirestore();

  if (!documentRef || !highlightsRef) {
    return <></>;
  }

  return (
    <Grid container item xs={12} style={{ position: "relative" }} spacing={0}>
      <HighlightCollabEditor
        authorID={authorID}
        authorName={authorName}
        quillRef={reactQuillRef}
        document={document}
        revisionsRef={documentRef.collection("revisions")}
        deltasRef={documentRef.collection("deltas")}
        highlightsRef={highlightsRef}
        suggestionsRef={documentRef.collection("suggestions")}
        cursorsRef={documentRef.collection("cursors")}
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
          history: {
            // delay: 2000,
            // maxStack: 500,
            userOnly: true,
          },
        }}
        suggestionsOpen={suggestionsOpen}
        setSuggestionsOpen={setSuggestionsOpen}
        setHasSuggestions={setHasSuggestions}
      />
    </Grid>
  );
}
