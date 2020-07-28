import React from "react";

import "./style.css";

export default function Shell(props) {
  return (
    <div className="Shell h-100 p-0" fluid>
      <div className="h-100 d-flex">{props.children}</div>
    </div>
  );
}
