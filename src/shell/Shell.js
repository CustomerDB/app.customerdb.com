import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";

import "./style.css";

export default function Shell(props) {
  return (
    <div className="Shell h-100 p-0">
      <div className="h-100 d-flex">{props.children}</div>
    </div>
  );
}
