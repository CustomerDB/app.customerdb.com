import CreateIcon from "@material-ui/icons/Create";
import IconButton from "@material-ui/core/IconButton";
import React, { useRef, useEffect, useState } from "react";
import { circumscribingCircle } from "./geom.js";

export function computeGroupBounds(cards) {
  let rect = {};

  if (cards.length > 0) {
    let card0 = cards[0];
    rect.minX = card0.minX;
    rect.minY = card0.minY;
    rect.maxX = card0.maxX;
    rect.maxY = card0.maxY;
    cards.forEach((card) => {
      rect.minX = Math.min(rect.minX, card.minX);
      rect.minY = Math.min(rect.minY, card.minY);
      rect.maxX = Math.max(rect.maxX, card.maxX);
      rect.maxY = Math.max(rect.maxY, card.maxY);
    });
  }

  return rect;
}

export default function Group({ name, group, cards }) {
  if (cards === undefined || cards.length < 2) {
    return <></>;
  }

  let rect = computeGroupBounds(cards);
  group.minX = rect.minX;
  group.minY = rect.minY;
  group.maxX = rect.maxX;
  group.maxY = rect.maxY;

  let circle = circumscribingCircle(rect);
  let color = group.color;

  let border = `2px ${color} solid`;

  return (
    <>
      <div
        className="group"
        style={{
          position: "absolute",
          left: circle.minX,
          top: circle.minY,
          width: circle.diameter,
          height: circle.diameter,
          borderRadius: "50%",
          border: border,
          backgroundColor: `${color}`,
          opacity: 0.5,
        }}
      >
        {}
      </div>

      <div
        className="groupLabel"
        style={{
          position: "absolute",
          left: circle.minX,
          top: circle.maxY + 10,
          width: circle.diameter,
          textAlign: "center",
        }}
      >
        <div className="d-flex justify-content-center">
          <div className="d-flex justify-content-center">
            <div className="align-self-center">{name}</div>{" "}
            <IconButton
            // onClick={() =>
            //   this.props.renameGroupModalCallback(this.props.group.ID)
            // }
            >
              <CreateIcon />
            </IconButton>
          </div>
        </div>
      </div>
    </>
  );
}
