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
import Typography from "@material-ui/core/Typography";
import { hexToRGB } from "../util/color.js";
import Player from "./Player";

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

    console.debug(`Starting to fetch media URL for ${hit.mediaPath}`);

    firebase
      .storage()
      .ref()
      .child(hit.mediaPath)
      .getDownloadURL()
      .then((url) => {
        console.debug(`Got url: ${url}`);
        setMediaURL(url);
      });
  }, [hit.mediaPath, firebase]);

  const quoteURL = `/orgs/${orgID}/interviews/${hit.documentID}/${hit.source}?quote=${hit.objectID}`;

  const linkedTitle = (
    <Link style={{ color: "black" }} to={quoteURL}>
      {hit.documentName}
    </Link>
  );

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
            {hit.personName && (
              <Avatar
                size={30}
                name={hit.personName}
                round={true}
                src={hit.personImageURL}
                style={{ display: "inline-block", marginRight: "0.5rem" }}
              />
            )}
            <p style={{ display: "inline" }}>
              {hit.personName}{" "}
              <Moment fromNow date={documentCreationTimestamp} />
            </p>
          </div>

          <Player mediaURL={mediaURL} playerRef={playerRef} highlight={hit} />

          <div style={{ margin: "0.5rem" }}>
            <Typography variant="body2" color="textSecondary" component="p">
              <span className="quoteContext">{contextPrefix}</span>
              <span
                style={{
                  backgroundColor: attenuatedHighlightColor,
                  color: "#000",
                }}
              >
                <Highlight hit={hit} attribute="text" />
              </span>
              <span className="quoteContext">{contextSuffix}</span>
            </Typography>
            <div style={{ paddingTop: "1rem" }}>
              <Chip
                size="small"
                label={hit.tagName}
                style={{
                  backgroundColor: hit.tagColor,
                  color: hit.tagTextColor,
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
