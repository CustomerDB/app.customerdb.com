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
import { debounce } from "debounce";
import { hexToRGB } from "../util/color.js";

export default function QuoteHit({ hit, reactQuillRef }) {
  const firebase = useContext(FirebaseContext);
  const [mediaURL, setMediaURL] = useState();
  const [drag, setDrag] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cardRect, setCardRect] = useState();
  const [scrollTop, setScrollTop] = useState(0);
  const playerRef = useRef();
  const cardRef = useRef();

  let documentCreationTimestamp = new Date(
    hit.documentCreationTimestamp * 1000
  );

  useEffect(() => {
    if (!firebase || !hit.mediaPath) {
      return;
    }

    firebase
      .storage()
      .ref()
      .child(hit.mediaPath)
      .getDownloadURL()
      .then((url) => {
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
    const cardRect = cardRef.current.getBoundingClientRect();
    const scrollPane = document.getElementById("summary-sidebar-scroll");
    setScrollTop(scrollPane.scrollTop);
    setCardRect(cardRect);
    setDrag(true);
  };

  const updateCursor = debounce((e) => {
    const editor =
      reactQuillRef &&
      reactQuillRef.current &&
      reactQuillRef.current.getEditor();

    if (!editor) return;
    const dropTarget = document.elementFromPoint(e.x, e.y);
    if (dropTarget && editor.container.contains(dropTarget)) {
      const blot = Quill.find(dropTarget, true);
      if (!blot) return;
      let insertIndex = 0;

      if (!blot.cache || !blot.cache.length) {
        insertIndex = editor.getLength();
      } else {
        const blotStart = editor.getIndex(blot);
        insertIndex = blotStart + blot.cache.length;
      }
      editor.setSelection(insertIndex);
    }
  }, 1000);

  useEffect(() => {
    updateCursor.clear();
  }, [updateCursor]);

  const handleDrag = (e) => {
    setPosition({
      x: e.x - cardRect.x,
      y: e.y - cardRect.y - scrollTop,
    });
    updateCursor.clear();
    updateCursor(e);
  };

  const handleDragStop = (e) => {
    setPosition({ x: 0, y: 0 });
    setDrag(false);

    const editor =
      reactQuillRef &&
      reactQuillRef.current &&
      reactQuillRef.current.getEditor();

    if (!editor) return;

    const dropTarget = document.elementFromPoint(e.x, e.y);
    if (dropTarget && editor.container.contains(dropTarget)) {
      const blot = Quill.find(dropTarget, true);
      if (!blot) return;
      let insertIndex = 0;

      if (!blot.cache || !blot.cache.length) {
        insertIndex = editor.getLength();
      } else {
        const blotStart = editor.getIndex(blot);
        insertIndex = blotStart + blot.cache.length;
      }
      insertQuote(editor, hit.objectID, insertIndex);
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
        width: drag ? cardRect.width : "100%",
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
          height: `${cardRect.height}px`,
          backgroundColor: "#fafafa",
        }}
      ></Card>
    );
  }

  return (
    <>
      <Draggable
        position={position}
        axis="none"
        nodeRef={cardRef}
        onStart={handleDragStart}
        onDrag={handleDrag}
        onStop={handleDragStop}
      >
        {card}
      </Draggable>
      {placeholder}
    </>
  );
}
