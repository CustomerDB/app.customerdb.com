import React, { useContext, useEffect, useRef, useState } from "react";

import Draggable from "react-draggable";
import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";
import FirebaseContext from "../util/FirebaseContext.js";
import { Highlight } from "react-instantsearch-dom";
import Moment from "react-moment";
import ReactPlayer from "react-player";
import Typography from "@material-ui/core/Typography";
import Quill from "quill";
import { insertQuote } from "./embed/insert.js";

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

export default function QuoteHit({ hit, reactQuillRef }) {
  const firebase = useContext(FirebaseContext);
  const [mediaURL, setMediaURL] = useState();
  const [drag, setDrag] = useState(false);
  const [cardHeight, setCardHeight] = useState("6rem");
  const [dragCardWidth, setDragCardWidth] = useState("100%");
  const playerRef = useRef();
  const cardRef = useRef();

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

  const handleDragStart = (e) => {
    e.preventDefault();
    const cardRect = cardRef.current.getBoundingClientRect();
    setCardHeight(cardRect.height);
    setDragCardWidth(cardRect.width);
    setDrag(true);
  };

  const handleDragStop = (e) => {
    console.debug("item drag stop", e);
    setDrag(false);

    const editor =
      reactQuillRef &&
      reactQuillRef.current &&
      reactQuillRef.current.getEditor();

    if (!editor) return;

    console.debug("editor", editor);

    const dropTarget = document.elementFromPoint(e.x, e.y);
    if (dropTarget && editor.container.contains(dropTarget)) {
      const blot = Quill.find(dropTarget, true);
      if (!blot) return;
      const blotStart = editor.getIndex(blot);
      const blotEnd = blotStart + blot.cache.length;
      insertQuote(editor, hit.objectID, blotEnd);
    }
  };

  const card = (
    <Card
      key={hit.objectID}
      ref={cardRef}
      elevation={1}
      style={{
        zIndex: "99",
        position: drag ? "absolute" : "relative",
        width: drag ? dragCardWidth : "100%",
        margin: "0.5rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        opacity: drag ? 0.75 : 1.0,
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
          {hit.documentName}
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
  );

  let placeholder = <></>;

  if (drag) {
    placeholder = (
      <Card
        key={`${hit.objectID}-placeholder`}
        elevation={1}
        style={{
          position: "relative",
          width: "100%",
          padding: 0,
          margin: "0.5rem",
          borderRadius: "0.5rem",
          height: `${cardHeight}px`,
          backgroundColor: "#fafafa",
        }}
      ></Card>
    );
  }

  return (
    <>
      <Draggable
        position={drag ? undefined : { x: 0, y: 0 }}
        nodeRef={cardRef}
        onStart={handleDragStart}
        onStop={handleDragStop}
        zIndex={drag ? 99 : 1}
      >
        {card}
      </Draggable>
      {placeholder}
    </>
  );
}
