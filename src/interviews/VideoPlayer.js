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

import * as firebaseClient from "firebase/app";

import React, { useContext, useEffect, useRef, useState } from "react";
import { indexToTime, timeToIndex } from "./transcript/timecodes.js";

import Delta from "quill-delta";
import FirebaseContext from "../util/FirebaseContext.js";
import IntervalTree from "@flatten-js/interval-tree";
import ReactPlayer from "react-player";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";

export default function VideoPlayer({
  doc,
  transcriptionVideo,
  reactQuillRef,
  selectionChannelPort,
}) {
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { documentRef } = useFirestore();
  const [revisionID, setRevisionID] = useState();
  const [initialRevision, setInitialRevision] = useState();
  const [timecodes, setTimecodes] = useState();
  const [indexTree, setIndexTree] = useState();
  const [timeTree, setTimeTree] = useState();
  const playerRef = useRef();
  const [currentPlayhead, setCurrentPlayhead] = useState();
  const [selection, setSelection] = useState();

  const [playerRate, setPlayerRate] = useState(1);

  const onPlayerRateChange = (event) => {
    setPlayerRate(event.target.value);
  };

  selectionChannelPort.onmessage = (msg) => {
    setSelection(msg.data);
  };

  useEffect(() => {
    if (!documentRef || !doc || doc.pending) {
      return;
    }
    documentRef
      .collection("transcriptRevisions")
      .where("timestamp", ">", new firebaseClient.firestore.Timestamp(0, 0))
      .orderBy("timestamp", "asc")
      .limit(1)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          return;
        }
        let revData = snapshot.docs[0].data();
        let revision = new Delta(revData.delta.ops);
        setInitialRevision(revision);
        setRevisionID(snapshot.docs[0].id);
      });
  }, [documentRef, doc, doc.pending]);

  useEffect(() => {
    if (!revisionID || !doc || doc.pending) return;

    // Download timecodes file and set state.
    const path = `${orgID}/transcriptions/${doc.transcription}/output/timecodes-${revisionID}.json`;
    console.debug(`downloading timecodes file for transcript: ${path}`);
    firebase
      .storage()
      .ref(path)
      .getDownloadURL()
      .then((url) => {
        let xhr = new XMLHttpRequest();
        xhr.responseType = "blob";
        xhr.onerror = (error) => {
          console.warn("error loading timecodes blob", error);
        };
        xhr.onload = (event) => {
          try {
            xhr.response.text().then((jsonString) => {
              setTimecodes(JSON.parse(jsonString));
            });
          } catch (error) {
            console.warn("error parsing timecodes blob", error);
          }
        };
        xhr.open("GET", url);
        xhr.send();
      });
  }, [revisionID, doc, doc.transcription, doc.pending, firebase, orgID]);

  useEffect(() => {
    if (!timecodes) return;

    let newIndexTree = new IntervalTree();
    let newTimeTree = new IntervalTree();

    timecodes.forEach(([s, e, i, j]) => {
      newIndexTree.insert([i, j], [s, e]);
      newTimeTree.insert([s, e], [i, j]);
    });

    setIndexTree(newIndexTree);
    setTimeTree(newTimeTree);
  }, [timecodes]);

  useEffect(() => {
    if (
      !selection ||
      !initialRevision ||
      !indexTree ||
      !playerRef.current ||
      !reactQuillRef ||
      !reactQuillRef.current
    ) {
      return;
    }
    let currentRevision = reactQuillRef.current.getEditor().getContents();
    let time = indexToTime(
      selection.index,
      indexTree,
      initialRevision,
      currentRevision
    );
    if (time) {
      playerRef.current.seekTo(time);
    }
  }, [indexTree, selection, reactQuillRef, initialRevision]);

  const onVideoProgress = ({ playedSeconds }) => {
    if (
      !initialRevision ||
      !timeTree ||
      !reactQuillRef ||
      !reactQuillRef.current
    ) {
      return;
    }
    let editor = reactQuillRef.current.getEditor();
    let currentRevision = editor.getContents();
    let indexes = timeToIndex(
      playedSeconds,
      timeTree,
      initialRevision,
      currentRevision
    );

    if (!indexes) {
      return;
    }

    let [startIndex, endIndex] = indexes;
    if (currentPlayhead && currentPlayhead.startIndex !== startIndex) {
      // Unset playhead formatting.
      editor.formatText(
        0,
        editor.getLength(),
        "playhead",
        false, // unsets the target format
        "api"
      );
    }
    setCurrentPlayhead({ startIndex, endIndex });
  };

  useEffect(() => {
    if (!currentPlayhead || !reactQuillRef || !reactQuillRef.current) {
      return;
    }
    let editor = reactQuillRef.current.getEditor();

    editor.formatText(
      currentPlayhead.startIndex,
      currentPlayhead.endIndex - currentPlayhead.startIndex,
      "playhead",
      true,
      "api"
    );
  }, [currentPlayhead, reactQuillRef]);

  return (
    <>
      <div style={{ position: "relative" }}>
        <ReactPlayer
          ref={playerRef}
          url={transcriptionVideo}
          onProgress={onVideoProgress}
          progressInterval={100}
          playbackRate={playerRate}
          controls
          width="100%"
          height="100%"
        />
      </div>
      <FormControl>
        <Select
          labelId="player-rate-select-label"
          id="player-rate-select"
          value={playerRate}
          onChange={onPlayerRateChange}
        >
          <MenuItem value={1}>1x</MenuItem>
          <MenuItem value={1.5}>1.5x</MenuItem>
          <MenuItem value={2}>2x</MenuItem>
        </Select>
      </FormControl>
    </>
  );
}
