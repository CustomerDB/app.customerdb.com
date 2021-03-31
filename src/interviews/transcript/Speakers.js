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

import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import Speaker from "./Speaker.js";
import useFirestore from "../../db/Firestore.js";
import { useParams } from "react-router-dom";

export default function Speakers({
  transcriptionID,
  quillRef,
  editorContainerRef,
}) {
  const { transcriptionsRef } = useFirestore();
  const { orgID } = useParams();
  const [speakers, setSpeakers] = useState();
  const [speakerNodes, setSpeakerNodes] = useState();

  const refreshNodes = () => {
    let nodes = document.getElementsByClassName("speaker");

    // TODO(NN): Find a more stable way of detecting "document loaded"
    if (nodes.length === 0) {
      return;
    }

    let newSpeakerNodes = [];
    for (let i = 0; i < nodes.length; i++) {
      let node = nodes[i];
      if (node.dataset.speakerID) {
        newSpeakerNodes.push(node);
      }
    }

    setSpeakerNodes(newSpeakerNodes);
  };

  useEffect(() => {
    if (!editorContainerRef || !editorContainerRef.current) {
      return;
    }
    let editorContainer = editorContainerRef.current;
    console.log("setting up observer for speakers", editorContainer);
    const observer = new MutationObserver(refreshNodes);
    observer.observe(editorContainer, { childList: true, subtree: true });
    return () => {
      if (document.body.contains(editorContainer)) {
        observer.disconnect();
      }
    };
  }, [editorContainerRef]);

  // operationRef for speaker mapping
  // {ID: {name: ..., personID: ...}}
  useEffect(() => {
    if (!orgID || !transcriptionsRef || !transcriptionID) {
      return;
    }
    return transcriptionsRef
      .doc(transcriptionID)
      .collection("speakers")
      .onSnapshot((snapshot) => {
        let newSpeakers = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newSpeakers[doc.id] = data;
        });
        setSpeakers(newSpeakers);
      });
  }, [orgID, transcriptionsRef, transcriptionID]);

  // Repair speaker records if missing
  useEffect(() => {
    if (!speakerNodes || !speakers || !transcriptionID || !transcriptionsRef) {
      return;
    }
    speakerNodes.forEach((node) => {
      let speakerID = node.dataset.speakerID;
      if (!speakers[speakerID]) {
        transcriptionsRef
          .doc(transcriptionID)
          .collection("speakers")
          .doc(speakerID)
          .set(
            {
              ID: speakerID,
            },
            { merge: true }
          );
      }
    });
  }, [speakerNodes, speakers, transcriptionID, transcriptionsRef]);

  // Delete unused speaker records
  useEffect(() => {
    if (!transcriptionsRef || !speakerNodes || !speakers) return;

    let assignedSpeakers = new Set();
    speakerNodes.forEach((sn) => assignedSpeakers.add(sn.dataset.speakerID));
    Object.keys(speakers).forEach((speakerID) => {
      if (!assignedSpeakers.has(speakerID)) {
        console.debug("deleting unassigned speaker", speakerID);
        transcriptionsRef
          .doc(transcriptionID)
          .collection("speakers")
          .doc(speakerID)
          .delete();
      }
    });
  }, [transcriptionID, transcriptionsRef, speakerNodes, speakers]);

  if (!speakerNodes) {
    return <></>;
  }

  return speakerNodes.map((sn) => {
    return ReactDOM.createPortal(
      <Speaker
        speakerNode={sn}
        quillRef={quillRef}
        speakers={speakers}
        speakerID={sn.dataset.speakerID}
        transcriptionID={transcriptionID}
      />,
      sn
    );
  });
}
