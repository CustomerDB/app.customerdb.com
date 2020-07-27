import React, { useEffect, useState } from "react";

import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import Options from "../shell/Options.js";
import Modal from "../shell/Modal.js";

import { circumscribingCircle } from "./geom.js";

function computeGroupBounds(cards) {
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

export default function Group(props) {
  useEffect(() => {
    return () => {
      props.removeGroupLocationCallback(props.group);
    };
  });

  const RenameModal = (props) => {
    const [name, setName] = useState(props.name);

    return (
      <Modal
        name="Rename group"
        show={props.show}
        onHide={props.onHide}
        footer={[
          <Button
            onClick={() => {
              props.group.name = name;
              props.groupRef.update(props.group);
            }}
          >
            Save
          </Button>,
        ]}
      >
        <Form.Control
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
      </Modal>
    );
  };

  let options = (
    <Options>
      <Options.Item
        name="Rename"
        modal={
          <RenameModal
            name={props.name}
            group={props.group}
            groupRef={props.groupRef}
          />
        }
      />
    </Options>
  );

  const rect = computeGroupBounds(props.cards);
  props.group.minX = rect.minX;
  props.group.minY = rect.minY;
  props.group.maxX = rect.maxX;
  props.group.maxY = rect.maxY;

  props.addGroupLocationCallback(props.group);

  let documentIDs = new Set();
  props.cards.forEach((card) => {
    documentIDs.add(card.documentID);
  });
  const representation = documentIDs.size;

  let circle = circumscribingCircle(rect);
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
          border: `2px ${props.group.color} solid`,
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
            <div className="align-self-center">{props.name}</div> {options}
          </div>
        </div>
        <p>
          {representation} out of {props.totalCardCount}
        </p>
      </div>
    </>
  );
}
