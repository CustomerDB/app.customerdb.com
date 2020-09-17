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
  const { orgID, documentID } = useParams();
  const { documentRef } = useFirestore();
  const [revisionID, setRevisionID] = useState();
  const [initialRevision, setInitialRevision] = useState();
  const [timecodes, setTimecodes] = useState();
  const [indexTree, setIndexTree] = useState();
  const [timeTree, setTimeTree] = useState();
  const playerRef = useRef();
  const [indicatorRange, setIndicatorRange] = useState();

  useEffect(() => {
    if (!documentRef) {
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
  }, [documentRef]);

  useEffect(() => {
    if (!revisionID) return;

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
          console.error("error loading timecodes blob", error);
        };
        xhr.onload = (event) => {
          try {
            console.log("xhr.response", xhr.response);
            xhr.response.text().then((jsonString) => {
              setTimecodes(JSON.parse(jsonString));
            });
          } catch (error) {
            console.error("error parsing timecodes blob", error);
          }
        };
        xhr.open("GET", url);
        xhr.send();
      });
  }, [revisionID]);

  useEffect(() => {
    if (!indicatorRange) {
      return;
    }
  }, [indicatorRange]);

  useEffect(() => {
    if (!timecodes) return;

    console.debug("timecodes", timecodes);

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
    if (!selection || !initialRevision || !indexTree || !playerRef.current) {
      return;
    }
    let currentRevision = editor.getContents();
    let time = indexToTime(
      selection.index,
      indexTree,
      initialRevision,
      currentRevision
    );
    console.log("time", time);
    if (time) {
      playerRef.current.seekTo(time);
    }
  }, [indexTree, selection, editor, initialRevision]);

  const onVideoProgress = ({ playedSeconds }) => {
    if (!initialRevision || !timeTree) {
      return;
    }
    let currentRevision = editor.getContents();
    let index = timeToIndex(
      playedSeconds,
      timeTree,
      initialRevision,
      currentRevision
    );
    console.log("index", index);
    if (index) {
      let [blot, offset] = editor.getLeaf(index);
      console.debug("blot", blot);
      console.debug("offset", offset);
      let range = document.createRange();
      range.selectNode(blot.domNode);
      range.setStart(blot.domNode, offset);
      range.setEnd(blot.domNode, offset + 1);
      setIndicatorRange(range);
    }
  };

  return (
    <>
      <ReactPlayer
        ref={playerRef}
        url={transcriptionVideo}
        onProgress={onVideoProgress}
        progressInterval={250}
        controls
        width="100%"
        height="100%"
      />
    </>
  );
}
