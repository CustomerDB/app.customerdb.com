import React, { useState } from "react";

import Dropdown from "react-bootstrap/Dropdown";

import { ThreeDotsVertical } from "react-bootstrap-icons";

export default class Option extends React.Component {
  static Item(props) {
    const [show, setShow] = useState(false);

    let modal;
    let onClick;
    if (props.modal) {
      modal = React.cloneElement(props.modal, {
        show: show,
        onHide: () => {
          setShow(false);
        },
      });

      onClick = () => {
        console.log("Dropdown item clicked");
        setShow(true);
      };
    }

    console.log("Props for options item", props);

    if (props.onClick) {
      console.log("Setting onclick handler for item");
      onClick = props.onClick;
    }

    return (
      <>
        <Dropdown.Item onClick={onClick}>{props.name}</Dropdown.Item>
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
