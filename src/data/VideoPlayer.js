import * as firebaseClient from "firebase/app";

import React, { useEffect, useState } from "react";

import Delta from "quill-delta";
import IntervalTree from "@flatten-js/interval-tree";
import ReactPlayer from "react-player";
import { indexToTime } from "./transcript/timecodes.js";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

export default function VideoPlayer({ transcriptionVideo, editor, selection }) {
  const { documentID } = useParams();
  const { documentRef } = useFirestore();
  const [initialRevision, setInitialRevision] = useState();
  const [indexTree, setIndexTree] = useState();

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
      });
  }, [documentRef]);

  useEffect(() => {
    if (documentID === "qevu3lmnyNNr30CjyZHRE") {
      let raw = {
        speechTranscriptions: [
          {
            alternatives: [
              {
                transcript:
                  "This is a recording of us using our own software. One, two, three four.",
                confidence: 0.8647001385688782,
                words: [
                  {
                    startTime: {
                      seconds: "1",
                      nanos: 300000000,
                    },
                    endTime: {
                      seconds: "1",
                      nanos: 700000000,
                    },
                    word: "This",
                  },
                  {
                    startTime: {
                      seconds: "1",
                      nanos: 700000000,
                    },
                    endTime: {
                      seconds: "1",
                      nanos: 900000000,
                    },
                    word: "is",
                  },
                  {
                    startTime: {
                      seconds: "1",
                      nanos: 900000000,
                    },
                    endTime: {
                      seconds: "1",
                      nanos: 900000000,
                    },
                    word: "a",
                  },
                  {
                    startTime: {
                      seconds: "1",
                      nanos: 900000000,
                    },
                    endTime: {
                      seconds: "2",
                      nanos: 700000000,
                    },
                    word: "recording",
                  },
                  {
                    startTime: {
                      seconds: "2",
                      nanos: 800000000,
                    },
                    endTime: {
                      seconds: "3",
                    },
                    word: "of",
                  },
                  {
                    startTime: {
                      seconds: "3",
                    },
                    endTime: {
                      seconds: "3",
                      nanos: 200000000,
                    },
                    word: "us",
                  },
                  {
                    startTime: {
                      seconds: "3",
                      nanos: 200000000,
                    },
                    endTime: {
                      seconds: "3",
                      nanos: 600000000,
                    },
                    word: "using",
                  },
                  {
                    startTime: {
                      seconds: "3",
                      nanos: 600000000,
                    },
                    endTime: {
                      seconds: "3",
                      nanos: 800000000,
                    },
                    word: "our",
                  },
                  {
                    startTime: {
                      seconds: "3",
                      nanos: 800000000,
                    },
                    endTime: {
                      seconds: "4",
                    },
                    word: "own",
                  },
                  {
                    startTime: {
                      seconds: "4",
                    },
                    endTime: {
                      seconds: "4",
                      nanos: 700000000,
                    },
                    word: "software.",
                  },
                  {
                    startTime: {
                      seconds: "5",
                      nanos: 200000000,
                    },
                    endTime: {
                      seconds: "5",
                      nanos: 400000000,
                    },
                    word: "One,",
                  },
                  {
                    startTime: {
                      seconds: "5",
                      nanos: 400000000,
                    },
                    endTime: {
                      seconds: "5",
                      nanos: 500000000,
                    },
                    word: "two,",
                  },
                  {
                    startTime: {
                      seconds: "5",
                      nanos: 500000000,
                    },
                    endTime: {
                      seconds: "5",
                      nanos: 800000000,
                    },
                    word: "three",
                  },
                  {
                    startTime: {
                      seconds: "5",
                      nanos: 800000000,
                    },
                    endTime: {
                      seconds: "6",
                      nanos: 200000000,
                    },
                    word: "four.",
                  },
                ],
              },
            ],
            languageCode: "en-us",
          },
        ],
      };

      let offset = 10; // "Speaker 1 "

      let newIndexTree = new IntervalTree();

      let alternative = raw.speechTranscriptions[0].alternatives[0];

      alternative.words.forEach((entry) => {
        let { startTime, endTime, word } = entry;
        let s = parseInt(startTime.seconds);
        if (startTime.nanos) {
          s += startTime.nanos / 1e9;
        }
        let e = parseInt(endTime.seconds);
        if (endTime.nanos) {
          e += endTime.nanos / 1e9;
        }
        let i = offset + 1;
        let j = i + word.length;
        offset = j + 1;
        newIndexTree.insert([i, j], [s, e]);
      });

      setIndexTree(newIndexTree);
    }
  }, [documentID]);

  useEffect(() => {
    if (!selection || !initialRevision) {
      return;
    }
    let currentRevision = editor.getContents();
    let timeForSelection = indexToTime(
      selection.index,
      indexTree,
      initialRevision,
      currentRevision
    );
    console.log("timeForSelection", timeForSelection);
  }, [indexTree, selection, editor, initialRevision]);

  return (
    <>
      <ReactPlayer
        url={transcriptionVideo}
        controls
        width="100%"
        height="100%"
      />
    </>
  );
}
