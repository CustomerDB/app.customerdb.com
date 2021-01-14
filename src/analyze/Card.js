import { bboxToRect, circumscribingCircle } from "./geom.js";

import Draggable from "react-draggable";
import React, { useRef, useEffect, useState } from "react";
import Chip from "@material-ui/core/Chip";
import Avatar from "react-avatar";
import Tooltip from "@material-ui/core/Tooltip";
import { useOrgTags } from "../organization/hooks";
import { useParams, Link } from "react-router-dom";

export default function Card({
  cardRef,
  scale,
  card,
  getIntersectingCardsCallBack,
  getIntersectingGroupsCallBack,
  addLocationCallBack,
  removeLocationCallBack,
  cardDragging,
  setCardDragging,
  groupDataForCardCallback,
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

    // Update group membership based on location.
    let groupData = groupDataForCardCallback(newCard);
    console.log("groupData", groupData);
    if (groupData.ID === undefined) {
      delete newCard["groupID"];
    } else {
      newCard.groupID = groupData.ID;
    }
    newCard.groupColor = groupData.color;
    newCard.textColor = groupData.textColor;

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

    let cardGroupIDs = new Set();
    let cardGroupColor = "#000";

    let intersections = getIntersectingCardsCallBack(rect);

    // Nothing to do
    if (intersections.length === 0) {
      setPreviewCircle();
      setPreviewColor();
      return;
    }

    intersections.forEach((card) => {
      cardGroupIDs.add(card.groupID);
    });

    // Check whether we are intersecting cards of more than one
    // group. (Includes case where we are intersecting an ungrouped
    // card and a grouped card.)
    if (cardGroupIDs.size !== 1) {
      setPreviewCircle();
      setPreviewColor();
      return;
    }

    let groupID = cardGroupIDs.values().next().value; // may be `undefined`

    // Check whether the intersecting cards are not already part
    // of a group, in which case we would create a new group if
    // dropped here
    if (groupID !== undefined) {
      let intersectingGroups = getIntersectingGroupsCallBack(rect);
      intersectingGroups.forEach((group) => {
        if (group.ID === groupID) {
          cardGroupColor = group.color;
          intersections.push(group);
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
    setPreviewColor(cardGroupColor);
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
    if (!orgTags || !orgTags[document.tagGroupID]) {
      return;
    }

    setTag(orgTags[document.tagGroupID].tags[highlight.tagID]);
  }, [orgTags]);

  let divStyle = {
    zIndex: cardDragging ? "100" : "0",
  };

  let position = {
    x: minX,
    y: minY,
  };

  let groupPreview =
    previewCircle === undefined ? (
      <></>
    ) : (
      <div
        className="groupLabel"
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
          <div
            className="quote handle"
            style={{
              cursor: titleBarCursor,
            }}
          >
            {highlight.text}
          </div>
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <div>
              <Tooltip title={document.personName}>
                <Link to={`/orgs/${orgID}/people/${document.personID}`}>
                  <Avatar
                    name={document.personName}
                    size={30}
                    round={true}
                    style={{ margin: "0.125rem" }}
                    src={document.personImageURL}
                  />
                </Link>
              </Tooltip>
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
                  style={{ backgroundColor: tag.color, color: tag.textColor }}
                />
              </div>
            )}
          </div>
        </div>
      </Draggable>

      {groupPreview}
    </>
  );
}
