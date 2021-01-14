import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import useFirestore from "../db/Firestore.js";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Avatar from "react-avatar";
import Typography from "@material-ui/core/Typography";
import ReactPlayer from "react-player";
import Moment from "react-moment";
import { Highlight } from "react-instantsearch-dom";
import Chip from "@material-ui/core/Chip";

const hexToRGB = (hex) => {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const base = 16;
  const mask = 255;
  const decimal = parseInt(hex, base);
  return {
    r: (decimal >> 16) & mask,
    g: (decimal >> 8) & mask,
    b: decimal & mask,
  };
};

export default function QuoteSidepane({ highlight }) {
  const { allHighlightsRef, allTranscriptHighlightsRef } = useFirestore();
  const firebase = useContext(FirebaseContext);
  const [mediaURL, setMediaURL] = useState();
  const playerRef = useRef();
  const [cacheRef, setCacheRef] = useState();
  const [cache, setCache] = useState();
  const { orgID } = useParams();

  useEffect(() => {
    if (!highlight) {
      return;
    }

    let highlightRef;
    if (highlight.source === "notes") {
      highlightRef = allHighlightsRef.where("ID", "==", highlight.ID);
    }

    if (highlight.source === "transcript") {
      highlightRef = allTranscriptHighlightsRef.where("ID", "==", highlight.ID);
    }

    if (!highlightRef) {
      console.log(highlight);
      return;
    }

    return highlightRef.onSnapshot((snapshot) => {
      if (snapshot.size !== 1) {
        return;
      }

      setCacheRef(snapshot.docs[0].ref.collection("cache").doc("hit"));
    });
  }, [highlight, allHighlightsRef, allTranscriptHighlightsRef]);

  useEffect(() => {
    if (!cacheRef) {
      return;
    }

    console.log("Installing cache subscription");

    return cacheRef.onSnapshot((doc) => {
      setCache(doc.data());
    });
  }, [cacheRef]);

  useEffect(() => {
    if (!firebase || !cache || !cache.mediaPath) {
      setMediaURL();
      return;
    }

    console.debug(`Starting to fetch media URL for ${cache.mediaPath}`);

    firebase
      .storage()
      .ref()
      .child(cache.mediaPath)
      .getDownloadURL()
      .then((url) => {
        console.debug(`Got url: ${url}`);
        setMediaURL(url);
      });
  }, [cache, firebase]);

  if (!cache) {
    return <></>;
  }

  let documentCreationTimestamp = new Date(
    cache.documentCreationTimestamp * 1000
  );

  const quoteURL = `/orgs/${orgID}/interviews/${cache.documentID}/${cache.source}?quote=${cache.objectID}`;

  const linkedTitle = (
    <Link style={{ color: "black" }} to={quoteURL}>
      {cache.documentName}
    </Link>
  );

  let contextPrefix, contextSuffix;
  if (cache.context) {
    const start = cache.startIndex - cache.contextStartIndex;
    const end = cache.endIndex - cache.contextStartIndex;
    contextPrefix = cache.context.slice(0, start).trimStart();
    contextSuffix = cache.context.slice(end).trimEnd();
    if (contextPrefix) contextPrefix = `...${contextPrefix}`;
    if (contextSuffix) contextSuffix = `${contextSuffix}...`;
  }

  const rgb = hexToRGB(cache.tagColor);
  const opacity = 0.2;
  const attenuatedHighlightColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  return (
    <Grid
      container
      style={{ backgroundColor: "#f9f9f9", flexGrow: 1 }}
      alignItems="baseline"
    >
      <Grid container item>
        <Card
          style={{
            width: "100%",
            margin: "1rem",
            borderRadius: "0.5rem",
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              style={{ fontWeight: "bold" }}
            >
              {linkedTitle}
            </Typography>
            <div>
              {cache.personName && (
                <Avatar
                  size={30}
                  name={cache.personName}
                  round={true}
                  src={cache.personImageURL}
                  style={{ display: "inline", paddingRight: "0.5rem" }}
                />
              )}
              <p style={{ display: "inline" }}>
                {cache.personName}{" "}
                <Moment fromNow date={documentCreationTimestamp} />
              </p>
            </div>

            {mediaURL && (
              <div
                style={{
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  margin: "0.5rem",
                }}
              >
                <ReactPlayer
                  ref={playerRef}
                  url={mediaURL}
                  width="100%"
                  height="12rem"
                  light={cache.thumbnailURL || true}
                  playing={true}
                  onReady={() => {
                    if (
                      cache.startTime &&
                      playerRef.current.getCurrentTime() === 0
                    ) {
                      playerRef.current.seekTo(cache.startTime);
                    }
                  }}
                  controls
                />
              </div>
            )}

            <div style={{ margin: "0.5rem" }}>
              <Typography variant="body2" color="textSecondary" component="p">
                <span className="quoteContext">{contextPrefix}</span>
                <span
                  style={{
                    backgroundColor: attenuatedHighlightColor,
                    color: "#000",
                  }}
                >
                  {cache.text}
                </span>
                <span className="quoteContext">{contextSuffix}</span>
              </Typography>
              <div style={{ paddingTop: "1rem" }}>
                <Chip
                  size="small"
                  label={cache.tagName}
                  style={{
                    backgroundColor: cache.tagColor,
                    color: cache.tagTextColor,
                    fontWeight: "bold",
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
