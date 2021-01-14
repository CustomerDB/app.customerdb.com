import { bboxToRect, circumscribingCircle } from "./geom.js";

import Draggable from "react-draggable";
import React, { useRef, useEffect, useState } from "react";
import Chip from "@material-ui/core/Chip";
import Avatar from "react-avatar";
import Tooltip from "@material-ui/core/Tooltip";
import { useOrgTags } from "../organization/hooks";
import { useParams, Link } from "react-router-dom";
import LinearProgress from "@material-ui/core/LinearProgress";

export default function Card({
  cardRef,
  scale,
  card,
  getIntersectingCardsCallBack,
  getIntersectingThemesCallBack,
  addLocationCallBack,
  removeLocationCallBack,
  cardDragging,
  setCardDragging,
  themeDataForCardCallback,
  highlight,
  document,
  setSidepaneHighlight,
}) {
  const ref = useRef();
  const rect = useRef();

  const dragStartPosition = useRef();

  const orgTags = useOrgTags();

  const { orgID } = useParams();

  const [previewCircle, setPreviewCircle] = useState();
  const [previewColor, setPreviewColor] = useState();

  const [minX, setMinX] = useState(card.minX);
  const [minY, setMinY] = useState(card.minY);

  const [tag, setTag] = useState();

  const getRect = () => {
    if (!ref.current) {
      return;
    }

    let translateCSS = ref.current.style.transform;
    const [x, y] = translateCSS.match(/(\d+(\.\d+)?)/g);

    let boundingBox = ref.current.getBoundingClientRect();

    boundingBox.x = x;
    boundingBox.y = y;
    boundingBox.width = boundingBox.width / scale;
    boundingBox.height = boundingBox.height / scale;

    return bboxToRect(boundingBox);
  };

  const handleStart = () => {
    setCardDragging(true);
    removeLocationCallBack(card);
    dragStartPosition.current = Object.assign({}, rect.current);
  };

  const handleStop = () => {
    rect.current = getRect();

    // Detect "click" (non move).
    if (
      rect.current &&
      dragStartPosition.current &&
      rect.current.minX === dragStartPosition.current.minX &&
      rect.current.maxX === dragStartPosition.current.maxX &&
      rect.current.minY === dragStartPosition.current.minY &&
      rect.current.maxY === dragStartPosition.current.maxY
    ) {
      setSidepaneHighlight(highlight);
      dragStartPosition.current = undefined;
      addLocationCallBack(card);
      setCardDragging(false);
      return;
    }

    // Object.assign(card, rect);
    let newCard = Object.assign(card, rect.current);

    // Update theme membership based on location.
    let themeData = themeDataForCardCallback(newCard);
    console.log("themeData", themeData);
    if (themeData.ID === undefined) {
      delete newCard["themeID"];
    } else {
      newCard.themeID = themeData.ID;
    }
    newCard.themeColor = themeData.color;
    newCard.textColor = themeData.textColor;

    addLocationCallBack(newCard);

    setPreviewCircle();
    setPreviewColor();

    cardRef.set(newCard);

    setMinX(rect.current.minX);
    setMinY(rect.current.minY);
    setCardDragging(false);
  };

  const handleDrag = () => {
    let rect = getRect();

    let cardThemeIDs = new Set();
    let cardThemeColor = "#000";

    let intersections = getIntersectingCardsCallBack(rect);

    // Nothing to do
    if (intersections.length === 0) {
      setPreviewCircle();
      setPreviewColor();
      return;
    }

    intersections.forEach((card) => {
      cardThemeIDs.add(card.themeID);
    });

    // Check whether we are intersecting cards of more than one
    // theme. (Includes case where we are intersecting an unthemeed
    // card and a themeed card.)
    if (cardThemeIDs.size !== 1) {
      setPreviewCircle();
      setPreviewColor();
      return;
    }

    let themeID = cardThemeIDs.values().next().value; // may be `undefined`

    // Check whether the intersecting cards are not already part
    // of a theme, in which case we would create a new theme if
    // dropped here
    if (themeID !== undefined) {
      let intersectingThemes = getIntersectingThemesCallBack(rect);
      intersectingThemes.forEach((theme) => {
        if (theme.ID === themeID) {
          cardThemeColor = theme.color;
          intersections.push(theme);
        }
      });
    }

    intersections.push(rect);

    let bounds = Object.assign({}, rect);
    intersections.forEach((o) => {
      bounds.minX = Math.min(bounds.minX, o.minX);
      bounds.minY = Math.min(bounds.minY, o.minY);
      bounds.maxX = Math.max(bounds.maxX, o.maxX);
      bounds.maxY = Math.max(bounds.maxY, o.maxY);
    });

    let circle = circumscribingCircle(bounds);

    setPreviewCircle(circle);
    setPreviewColor(cardThemeColor);
  };

  useEffect(() => {
    rect.current = getRect();
  });

  useEffect(() => {
    if (!card) {
      return;
    }

    if (card.minX !== minX || card.minY !== minY) {
      setMinX(card.minX);
      setMinY(card.minY);
    }
  }, [card]);

  useEffect(() => {
    if (!orgTags || !card.highlightHitCache || !orgTags[document.tagThemeID]) {
      return;
    }

    setTag(orgTags[document.tagThemeID].tags[highlight.tagID]);
  }, [orgTags]);

  let divStyle = {
    zIndex: cardDragging ? "100" : "0",
  };

  let position = {
    x: minX,
    y: minY,
  };

  let themePreview =
    previewCircle === undefined ? (
      <></>
    ) : (
      <div
        className="themeLabel"
        style={{
          position: "absolute",
          left: previewCircle.minX,
          top: previewCircle.minY,
          height: previewCircle.diameter,
          width: previewCircle.diameter,
          borderRadius: "50%",
          border: `3px solid ${previewColor}`,
        }}
      />
    );

  let titleBarCursor = cardDragging ? "grabbing" : "grab";

  console.log("Card", card);

  // Draggable nodeRef required to fix findDOMNode warnings.
  // see: https://github.com/STRML/react-draggable/pull/478
  return (
    <>
      <Draggable
        nodeRef={ref}
        handle=".handle"
        bounds="parent"
        position={position}
        scale={scale}
        onStart={handleStart}
        onDrag={handleDrag}
        onStop={handleStop}
      >
        <div ref={ref} className="card" style={divStyle}>
          {!card.highlightHitCache && <LinearProgress />}
          {card.highlightHitCache && (
            <>
              <div
                className="quote handle"
                style={{
                  cursor: titleBarCursor,
                }}
              >
                {card.highlightHitCache.text}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <div>
                  {
                    <Tooltip title={card.personName}>
                      <Link
                        to={`/orgs/${orgID}/people/${card.highlightHitCache.personID}`}
                      >
                        <Avatar
                          name={card.highlightHitCache.personName}
                          size={30}
                          round={true}
                          style={{ margin: "0.125rem" }}
                          src={card.highlightHitCache.personImageURL}
                        />
                      </Link>
                    </Tooltip>
                  }
                </div>
                {tag && (
                  <div
                    style={{
                      display: "flex",
                      padding: "0.125rem",
                      flexGrow: "1",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Chip
                      size="small"
                      label={tag.name}
                      style={{
                        backgroundColor: tag.color,
                        color: tag.textColor,
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Draggable>

      {themePreview}
    </>
  );
}
