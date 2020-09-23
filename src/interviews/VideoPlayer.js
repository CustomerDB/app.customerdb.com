import * as firebaseClient from "firebase/app";

import React, { useContext, useEffect, useRef, useState } from "react";
import { indexToTime, timeToIndex } from "./transcript/timecodes.js";

import Delta from "quill-delta";
import FirebaseContext from "../util/FirebaseContext.js";
import IntervalTree from "@flatten-js/interval-tree";
import ReactPlayer from "react-player";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

export default function VideoPlayer({
  doc,
  transcriptionVideo,
  editor,
  selection,
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

  useEffect(() => {
    if (!documentRef || !doc || doc.pending) {
      return;
    }
    documentRef
      .collection("revisions")
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

    console.debug("downloading timecodes file for transcript");

    // Download timecodes file and set state.
    firebase
      .storage()
      .ref(
        `${orgID}/transcriptions/${doc.transcription}/output/timecodes-${revisionID}.json`
      )
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
      !editor
    ) {
      return;
    }
    let currentRevision = editor.getContents();
    let time = indexToTime(
      selection.index,
      indexTree,
      initialRevision,
      currentRevision
    );
    if (time) {
      playerRef.current.seekTo(time);
    }
  }, [indexTree, selection, editor, initialRevision]);

  const onVideoProgress = ({ playedSeconds }) => {
    if (!initialRevision || !timeTree || !editor) {
      return;
    }
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
        currentPlayhead.startIndex,
        currentPlayhead.endIndex - currentPlayhead.startIndex,
        "playhead",
        false, // unsets the target format
        "api"
      );
    }
    setCurrentPlayhead({ startIndex, endIndex });
  };

  useEffect(() => {
    if (!currentPlayhead || !editor) {
      return;
    }

    editor.formatText(
      currentPlayhead.startIndex,
      currentPlayhead.endIndex - currentPlayhead.startIndex,
      "playhead",
      true,
      "api"
    );
  }, [currentPlayhead, editor]);

  return (
    <>
      <ReactPlayer
        ref={playerRef}
        url={transcriptionVideo}
        onProgress={onVideoProgress}
        progressInterval={100}
        controls
        width="100%"
        height="100%"
      />
    </>
  );
}
