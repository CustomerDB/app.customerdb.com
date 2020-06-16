import React from 'react';

import { circumscribingCircle } from './geom.js';

export default function Group(props) {
  if (props.groupObject === undefined) {
    return <div></div>
  }

  let circle = circumscribingCircle(props.groupObject);
  let color = props.groupObject.data.color;

  let border = `2px ${color} solid`;

  return <><div
    className="group"
    style={{
      position: "absolute",
      left: circle.minX,
      top: circle.minY,
      width: circle.diameter,
      height: circle.diameter,
      borderRadius: "50%",
      border: border
    }}>
    { }
  </div>
  <div className="groupLabel" contentEditable style={{
      position: "absolute",
      left: circle.minX,
      top: circle.maxY + 10,
      width: circle.diameter,
      textAlign: "center"
    }}>
      Untitled
  </div>
  </>;
}
