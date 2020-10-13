import { Link, useParams } from "react-router-dom";
import React, { useContext, useEffect, useRef, useState } from "react";

import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import Chip from "@material-ui/core/Chip";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import Moment from "react-moment";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import ReactPlayer from "react-player";
import Typography from "@material-ui/core/Typography";

export default function Quote({ hit }) {
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const [mediaURL, setMediaURL] = useState();
  const playerRef = useRef();

  console.log(hit);

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

  let quoteURL = `/orgs/${orgID}/interviews/${hit.documentID}/${hit.source}?quote=${hit.objectID}`;

  let linkedTitle = <Link to={quoteURL}>{hit.documentName}</Link>;

  return (
    <Grid container item xs={12} md={6} lg={4}>
      <Card
        style={{
          width: "100%",
          minHeight: "16rem",
          margin: "1rem",
        }}
      >
        <CardHeader
          avatar={
            hit.personName && (
              <Avatar
                size={50}
                name={hit.personName}
                round={true}
                src={hit.personImageURL}
              />
            )
          }
          action={
            <IconButton aria-label="settings">
              <MoreVertIcon />
            </IconButton>
          }
          title={linkedTitle}
          subheader={<Moment fromNow date={documentCreationTimestamp} />}
        />
        {mediaURL && (
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
        )}
        <CardContent>
          <Typography variant="body2" color="textSecondary" component="p">
            {hit.text}
          </Typography>
          <div style={{ padding: "0.25rem" }}>
            <Chip
              size="small"
              label={hit.tagName}
              style={{ backgroundColor: hit.tagColor }}
            />
          </div>
        </CardContent>
      </Card>
    </Grid>
  );
}
