import { Link, useParams } from "react-router-dom";
import React, { useContext, useEffect, useRef, useState } from "react";

import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import { Highlight } from "react-instantsearch-dom";
import Moment from "react-moment";
import ReactPlayer from "react-player";
import Typography from "@material-ui/core/Typography";

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

export default function Quote({ hit }) {
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const [mediaURL, setMediaURL] = useState();
  const playerRef = useRef();

  let documentCreationTimestamp = new Date(
    hit.documentCreationTimestamp * 1000
  );

  useEffect(() => {
    if (!firebase || !hit.mediaPath) {
      return;
    }

    console.log(`Starting to fetch media URL for ${hit.mediaPath}`);

    firebase
      .storage()
      .ref()
      .child(hit.mediaPath)
      .getDownloadURL()
      .then((url) => {
        console.log(`Got url: ${url}`);
        setMediaURL(url);
      });
  }, [hit.mediaPath, firebase]);

  const quoteURL = `/orgs/${orgID}/interviews/${hit.documentID}/${hit.source}?quote=${hit.objectID}`;

  const linkedTitle = <Link style={{color: "black"}} to={quoteURL}>{hit.documentName}</Link>;

  let contextPrefix, contextSuffix;
  if (hit.context) {
    const start = hit.startIndex - hit.contextStartIndex;
    const end = hit.endIndex - hit.contextStartIndex;
    contextPrefix = hit.context.slice(0, start).trimStart();
    contextSuffix = hit.context.slice(end).trimEnd();
    if (contextPrefix) contextPrefix = `...${contextPrefix}`;
    if (contextSuffix) contextSuffix = `${contextSuffix}...`;
  }

  const rgb = hexToRGB(hit.tagColor);
  const opacity = 0.33;
  const attenuatedHighlightColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  console.log(hit);

  return (
    <Grid container item>
      <Card
        style={{
          width: "100%",
          margin: "1rem",
          borderRadius: "0.5rem",
        }}
      >
        {/* <CardHeader
          disableTypography={true}
          avatar={
            hit.personName && (
              <Avatar
                size={30}
                name={hit.personName}
                round={true}
                src={hit.personImageURL}
              />
            )
          }
          title={linkedTitle}
          subheader={<Moment fromNow date={documentCreationTimestamp} />}
        /> */}

        <CardContent>
          <Typography variant="h6" gutterBottom>
            {linkedTitle}
          </Typography>
          <div>
            {hit.personName && (
              <Avatar
                size={30}
                name={hit.personName}
                round={true}
                src={hit.personImageURL}
                style={{ display: "inline", paddingRight: "0.5rem" }}
              />
            )}
            <p style={{ display: "inline" }}>
              {hit.personName} <Moment fromNow date={documentCreationTimestamp} />
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
                light={hit.thumbnailURL || true}
                playing={true}
                onReady={() => {
                  if (hit.startTime && playerRef.current.getCurrentTime() === 0) {
                    playerRef.current.seekTo(hit.startTime);
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
                  color: hit.tagTextColor,
                }}
              >
                <Highlight hit={hit} attribute="text" />
              </span>
              <span className="quoteContext">{contextSuffix}</span>
            </Typography>
            <div style={{ padding: "0.5rem" }}>
              <Chip
                size="small"
                label={hit.tagName}
                style={{ backgroundColor: hit.tagColor, color: hit.tagTextColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Grid>
  );
}
