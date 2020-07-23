import React, { useState } from "react";

import Dropdown from "react-bootstrap/Dropdown";

import { ThreeDotsVertical } from "react-bootstrap-icons";

export default class Option extends React.Component {
  constructor(props) {
    super(props);
  }

  static Item(props) {
    const [showModal, setShowModal] = useState(false);

    let modal = React.cloneElement(props.modal, {
      show: showModal,
      onHide: () => {
        setShowModal(false);
      },
    });

    console.log("showModal ", showModal);

    return (
      <>
        <Dropdown.Item
          onClick={() => {
            console.log("Set modal");
            setShowModal(true);
          }}
        >
          {props.name}
        </Dropdown.Item>
        {modal}
      </>
    );
  }

  render() {
    let color;
    if (this.props.active) {
      color = "white";
    }

    return (
      <Dropdown style={{ width: "2.5rem", marginLeft: "auto" }}>
        <Dropdown.Toggle variant="link" className="threedots">
          <ThreeDotsVertical color={color} />
        </Dropdown.Toggle>
        <Dropdown.Menu>{this.props.children}</Dropdown.Menu>
      </Dropdown>
    );
  }
}
