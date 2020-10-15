import React, { useEffect, useRef, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import Chip from "@material-ui/core/Chip";
import ContentEditable from "react-contenteditable";
import Popover from "@material-ui/core/Popover";
import ReactDOM from "react-dom";
import useFirestore from "../../db/Firestore.js";
import { useParams } from "react-router-dom";

export default function Speakers({
  transcriptionID,
  quillContainerRef,
  editorContainerRef,
}) {
  const { transcriptionsRef } = useFirestore();
  const { orgID } = useParams();
  const [speakers, setSpeakers] = useState();
  const [speakerNodes, setSpeakerNodes] = useState([]);

  const refreshNodes = () => {
    let nodes = document.getElementsByClassName("speaker");

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
    return observer.disconnect;
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

  return speakerNodes.map((sn) => {
    let speakerData = speakers[sn.dataset.speakerID];
    if (!speakerData) {
      speakerData = { ID: sn.dataset.speakerID };
    }
    return ReactDOM.createPortal(
      <Speaker speakerData={speakerData} transcriptionID={transcriptionID} />,
      sn
    );
  });
}

function Speaker({ speakerData, transcriptionID }) {
  const { transcriptionsRef } = useFirestore();
  const [popOpen, setPopOpen] = useState(false);
  const chipRef = useRef();

  const speakerID = speakerData.ID || "unknown";
  const speakerName = speakerData.name || `Speaker ${speakerID}`;

  const popName = useRef();

  // TODO(CD): if photoURL is available, set Avatar alt and src instead
  let avatar = <Avatar alt={speakerName} />;

  const onClick = (e) => {
    if (!popOpen) {
      popName.current = speakerName;
      setPopOpen(true);
    }
  };

  const onPopClose = () => {
    setPopOpen(false);
  };

  const onPopNameChange = (e) => {
    console.debug("onPopNameChange", e.target.value);
    popName.current = e.target.value;
  };

  const onPopBlur = (e) => {
    if (!transcriptionsRef) {
      return;
    }
    console.debug("renaming speaker", popName.current);
    const speakerRef = transcriptionsRef
      .doc(transcriptionID)
      .collection("speakers")
      .doc(speakerID);
    speakerRef.set({ name: popName.current }, { merge: true });
  };

  return (
    <>
      <Chip
        ref={chipRef}
        avatar={avatar}
        label={speakerName}
        variant="outlined"
        onClick={onClick}
      />
      <Popover
        open={popOpen}
        anchorEl={chipRef.current}
        onClose={onPopClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <ContentEditable
          html={popName.current}
          onKeyDown={(e) => {
            console.debug(e);
            if (e.key === "Enter") {
              e.target.blur();
              e.preventDefault();
              setPopOpen(false);
            }
          }}
          onChange={onPopNameChange}
          onBlur={onPopBlur}
        />
      </Popover>
    </>
  );
}
