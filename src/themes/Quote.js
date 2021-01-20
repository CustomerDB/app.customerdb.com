import React, { useContext, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Avatar from "react-avatar";
import Typography from "@material-ui/core/Typography";
import ReactPlayer from "react-player";
import Moment from "react-moment";
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

export default function Quote({ highlight }) {
  const firebase = useContext(FirebaseContext);
  const [mediaURL, setMediaURL] = useState();
  const playerRef = useRef();
  const { orgID } = useParams();

  useEffect(() => {
    if (!firebase || !highlight || !highlight.mediaPath) {
      setMediaURL();
      return;
    }

    console.debug(`Starting to fetch media URL for ${highlight.mediaPath}`);

    firebase
      .storage()
      .ref()
      .child(highlight.mediaPath)
      .getDownloadURL()
      .then((url) => {
        console.debug(`Got url: ${url}`);
        setMediaURL(url);
      });
  }, [highlight, firebase]);

  if (!highlight) {
    return <></>;
  }

  let documentCreationTimestamp = new Date(
    highlight.documentCreationTimestamp * 1000
  );

  const quoteURL = `/orgs/${orgID}/interviews/${highlight.documentID}/${highlight.source}?quote=${highlight.objectID}`;

  const linkedTitle = (
    <Link style={{ color: "black" }} to={quoteURL}>
      {highlight.documentName}
    </Link>
  );

  let contextPrefix, contextSuffix;
  if (highlight.context) {
    const start = highlight.startIndex - highlight.contextStartIndex;
    const end = highlight.endIndex - highlight.contextStartIndex;
    contextPrefix = highlight.context.slice(0, start).trimStart();
    contextSuffix = highlight.context.slice(end).trimEnd();
    if (contextPrefix) contextPrefix = `...${contextPrefix}`;
    if (contextSuffix) contextSuffix = `${contextSuffix}...`;
  }

  const rgb = hexToRGB(highlight.tagColor);
  const opacity = 0.2;
  const attenuatedHighlightColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  return (
    <Grid container item>
      <Card
        style={{
          width: "100%",
          margin: "1rem",
          borderRadius: "0.5rem",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
            {linkedTitle}
          </Typography>
          <div>
            {highlight.personName && (
              <Avatar
                size={30}
                name={highlight.personName}
                round={true}
                src={highlight.personImageURL}
                style={{ display: "inline-block", marginRight: "0.5rem" }}
              />
            )}
            <p style={{ display: "inline" }}>
              {highlight.personName}{" "}
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
                light={highlight.thumbnailURL || true}
                playing={true}
                onReady={() => {
                  if (
                    highlight.startTime &&
                    playerRef.current.getCurrentTime() === 0
                  ) {
                    playerRef.current.seekTo(highlight.startTime);
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
                {highlight.text}
              </span>
              <span className="quoteContext">{contextSuffix}</span>
            </Typography>
            <div style={{ paddingTop: "1rem" }}>
              <Chip
                size="small"
                label={highlight.tagName}
                style={{
                  backgroundColor: highlight.tagColor,
                  color: highlight.tagTextColor,
                  fontWeight: "bold",
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Grid>
  );
}
