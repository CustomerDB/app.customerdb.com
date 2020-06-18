import React from 'react';
import ContentEditable from 'react-contenteditable';

import { circumscribingCircle } from './geom.js';

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

export default class Group extends React.Component {
  constructor(props) {
    super(props);
    this.nameRef = React.createRef();

    this.updateName = this.updateName.bind(this);

    this.state = {
      name: props.group.data.name
    }
  }

  updateName(e) {
    console.log("Group updateName:", e);
  }

  render() {
    if (this.props.cards === undefined || this.props.cards.length === 0) {
      return <></>;
    }

    let rect = computeGroupBounds(this.props.cards);
    let circle = circumscribingCircle(rect);
    let color = this.props.group.data.color;

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

    <ContentEditable
      innerRef={this.nameRef}
      tagName='div'
      className="groupLabel"
      html={this.state.name}
      disabled={false}
      onChange={this.updateName}
      style={{
        position: "absolute",
        left: circle.minX,
        top: circle.maxY + 10,
        width: circle.diameter,
        textAlign: "center"
      }} />
    </>;
  }
}
