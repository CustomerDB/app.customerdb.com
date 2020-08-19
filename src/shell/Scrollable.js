import React from "react";

export default function Scrollable(props) {
  return (
    <div className="scrollContainer h-100">
      <div className="scroll">{props.children}</div>
    </div>
  );
}
