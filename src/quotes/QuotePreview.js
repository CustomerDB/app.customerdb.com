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

import React, { useContext, useEffect, useRef, useState } from "react";

import { useParams } from "react-router-dom";
import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import Grid from "@material-ui/core/Grid";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Moment from "react-moment";
import FirebaseContext from "../util/FirebaseContext.js";
import useFirestore from "../db/Firestore.js";
import { hexToRGB } from "../util/color.js";
import Player from "../quotes/Player";

export default function QuotePreview({ highlightID, hideNotFound }) {
  const { orgID } = useParams();
  const [highlightExists, setHighlightExists] = useState(true);
  const [transcriptHighlightExists, setTranscriptHighlightExists] = useState(
    true
  );
  const [highlight, setHighlight] = useState();
  const [highlightRef, setHighlightRef] = useState();
  const [highlightCache, setHighlightCache] = useState();
  const [mediaURL, setMediaURL] = useState();
  const { allHighlightsRef, allTranscriptHighlightsRef } = useFirestore();
  const firebase = useContext(FirebaseContext);
  const playerRef = useRef();

  const subscribeToHighlight = (
    collectionRef,
    orgID,
    highlightID,
    setExists
  ) => {
    if (!collectionRef || !orgID || !highlightID || !setExists) return;

    return collectionRef
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
      .where("ID", "==", highlightID)
      .limit(1)
      .onSnapshot((snapshot) => {
        if (snapshot.size === 0) {
          setExists(false);
          return;
        }
        return snapshot.forEach((doc) => {
          setHighlightRef(doc.ref);
          setHighlight(doc.data());
          setExists(true);
        });
      });
  };

  useEffect(() => {
    if (!highlightRef) return;

    return highlightRef
      .collection("cache")
      .doc("hit")
      .onSnapshot((doc) => {
        setHighlightCache(doc.data());
      });
  }, [highlightRef]);

  useEffect(() => {
    return subscribeToHighlight(
      allHighlightsRef,
      orgID,
      highlightID,
      setHighlightExists
    );
  }, [allHighlightsRef, highlightID, orgID]);

  useEffect(() => {
    return subscribeToHighlight(
      allTranscriptHighlightsRef,
      orgID,
      highlightID,
      setTranscriptHighlightExists
    );
  }, [allTranscriptHighlightsRef, highlightID, orgID]);

  useEffect(() => {
    if (!firebase || !highlightCache || !highlightCache.mediaPath) return;
    firebase
      .storage()
      .ref()
      .child(highlightCache.mediaPath)
      .getDownloadURL()
      .then((url) => {
        setMediaURL(url);
      });
  }, [highlightCache, firebase]);

  if (!highlightExists && !transcriptHighlightExists) {
    if (hideNotFound) return <></>;

    return (
      <Card
        key={highlightID}
        style={{
          width: "100%",
          margin: "0.5rem",
          borderRadius: "0.5rem",
          padding: "0.5rem",
        }}
      >
        <p>Highlight not found</p>
      </Card>
    );
  }

  if (!highlight || !highlightCache)
    return (
      <Grid
        container
        key={highlightID}
        style={{
          width: "100%",
          margin: "0.5rem",
          borderRadius: "0.5rem",
        }}
        justify="center"
      >
        <CircularProgress />
      </Grid>
    );

  let contextPrefix, contextSuffix;

  if (highlightCache.context) {
    const start = highlightCache.startIndex - highlightCache.contextStartIndex;
    const end = highlightCache.endIndex - highlightCache.contextStartIndex;
    contextPrefix = highlightCache.context
      .slice(0, start)
      .replace(/[\r\n]+/g, " ")
      .trimStart();
    contextSuffix = highlightCache.context
      .slice(end)
      .replace(/[\r\n]+/g, " ")
      .trimEnd();
    if (contextPrefix) contextPrefix = `...${contextPrefix}`;
    if (contextSuffix) contextSuffix = `${contextSuffix}...`;
  }

  const rgb = hexToRGB(highlightCache.tagColor);
  const opacity = 0.2;
  const attenuatedHighlightColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  let documentCreationTimestamp = new Date(
    highlightCache.documentCreationTimestamp * 1000
  );

  return (
    <Card
      key={highlightID}
      style={{
        width: "100%",
        margin: "0.5rem",
        borderRadius: "0.5rem",
      }}
    >
      <CardContent>
        <div>
          {highlightCache.personName && (
            <Avatar
              size={30}
              name={highlightCache.personName}
              round={true}
              src={highlightCache.personImageURL}
              style={{ display: "inline", paddingRight: "0.5rem" }}
            />
          )}
          <p style={{ display: "inline" }}>
            <b>{highlightCache.personName}</b>
            <br />
            <em>
              <Moment fromNow date={documentCreationTimestamp} />
            </em>
          </p>
        </div>

        <Player
          mediaURL={mediaURL}
          playerRef={playerRef}
          highlight={highlightCache}
        />

        <div style={{ margin: "0.5rem" }}>
          <Typography variant="body1" color="textSecondary" component="p">
            <span className="quoteContext">{contextPrefix}</span>
            <span
              style={{
                backgroundColor: attenuatedHighlightColor,
                color: "#000",
              }}
            >
              {highlightCache.text.replace(/[\r\n]+/g, " ")}
            </span>
            <span className="quoteContext">{contextSuffix}</span>
          </Typography>
          <div style={{ paddingTop: "1rem" }}>
            <Chip
              size="small"
              label={highlightCache.tagName}
              style={{
                backgroundColor: highlightCache.tagColor,
                color: highlightCache.tagTextColor,
                fontWeight: "bold",
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
