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

import React, { useContext, useRef } from "react";

import UserAuthContext from "../auth/UserAuthContext";
import CollabEditor from "../editor/CollabEditor.js";
import QuoteBlot from "./embed/QuoteBlot";
import QuoteContents from "./embed/QuoteContents";
import ThemeBlot from "./embed/ThemeBlot";
import ThemeContents from "./embed/ThemeContents";
import useFirestore from "../db/Firestore.js";

import Grid from "@material-ui/core/Grid";
import Quill from "quill";

Quill.register(QuoteBlot);
Quill.register(ThemeBlot);

// SummaryEditor augments a collaborative editor with embedded item previews.
export default function SummaryEditor({ reactQuillRef }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { summaryRef } = useFirestore();
  const quillContainerRef = useRef();

  if (!summaryRef) {
    return <></>;
  }

  return (
    <>
      <Grid
        container
        ref={quillContainerRef}
        item
        xs={12}
        style={{
          position: "relative",
          backgroundColor: "#fff",
          zIndex: 2,
        }}
        spacing={0}
      >
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

      <QuoteContents
        quillContainerRef={quillContainerRef}
        reactQuillRef={reactQuillRef}
      />
      <ThemeContents
        quillContainerRef={quillContainerRef}
        reactQuillRef={reactQuillRef}
      />
    </>
  );
}
