import CreateIcon from "@material-ui/icons/Create";
import IconButton from "@material-ui/core/IconButton";
import React from "react";
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

export default class Group extends React.Component {
  constructor(props) {
    super(props);
    this.nameRef = React.createRef();

    this.updateName = this.updateName.bind(this);
  }

  updateName(e) {
    this.props.group.name = e.target.innerText;
    this.props.groupRef.update(this.props.group);
  }

  componentWillUnmount() {
    this.props.removeGroupLocationCallback(this.props.group);
  }

  render() {
    if (this.props.cards === undefined || this.props.cards.length === 0) {
      return <></>;
    }

    this.props.removeGroupLocationCallback(this.props.group);

    let rect = computeGroupBounds(this.props.cards);
    this.props.group.minX = rect.minX;
    this.props.group.minY = rect.minY;
    this.props.group.maxX = rect.maxX;
    this.props.group.maxY = rect.maxY;

    this.props.addGroupLocationCallback(this.props.group);

    let circle = circumscribingCircle(rect);
    let color = this.props.group.color;

    let border = `2px ${color} solid`;

    // let debug = <div style={{
    //   position: "absolute",
    //   left: rect.minX,
    //   top: rect.minY,
    //   width: rect.maxX - rect.minX,
    //   height: rect.maxY - rect.minY,
    //   border: "1px solid red"}}>{ }</div>;

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
              <div className="align-self-center">{this.props.name}</div>{" "}
              <IconButton
                onClick={() =>
                  this.props.renameGroupModalCallback(this.props.group.ID)
                }
              >
                <CreateIcon />
              </IconButton>
            </div>
          </div>
        </div>
      </>
    );
  }
}
