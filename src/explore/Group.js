import React from "react";

import { circumscribingCircle } from "./geom.js";
import Options from "../shell/Options.js";

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

// export default function Group(props) {
//   useEffect(() => {
//     return () => {
//       props.removeGroupLocationCallback(props.group);
//     };
//   });

//   const rect = computeGroupBounds(props.cards);
//   props.group.minX = rect.minX;
//   props.group.minY = rect.minY;
//   props.group.maxX = rect.maxX;
//   props.group.maxY = rect.maxY;

//   props.addGroupLocationCallback(props.group);

//   let documentIDs = new Set();
//   props.cards.forEach((card) => {
//     documentIDs.add(card.documentID);
//   });
//   const representation = documentIDs.size;

//   let circle = circumscribingCircle(rect);
//   return (
//     <>
//       <div
//         className="group"
//         style={{
//           position: "absolute",
//           left: circle.minX,
//           top: circle.minY,
//           width: circle.diameter,
//           height: circle.diameter,
//           borderRadius: "50%",
//           border: `2px ${props.group.color} solid`,
//         }}
//       >
//         {}
//       </div>

//       <div
//         className="groupLabel"
//         style={{
//           position: "absolute",
//           left: circle.minX,
//           top: circle.maxY + 10,
//           width: circle.diameter,
//           textAlign: "center",
//         }}
//       >
//         <div className="d-flex justify-content-center">
//           <div className="d-flex justify-content-center">
//             <div className="align-self-center">{props.name}</div> {options}
//           </div>
//         </div>
//         <p>
//           {representation} out of {props.totalCardCount}
//         </p>
//       </div>
//     </>
//   );
// }

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

    let options = (
      <Options>
        <Options.Item
          name="Rename"
          onClick={() =>
            this.props.renameGroupModalCallback(this.props.group.ID)
          }
        />
      </Options>
    );

    this.props.removeGroupLocationCallback(this.props.group);

    let rect = computeGroupBounds(this.props.cards);
    this.props.group.minX = rect.minX;
    this.props.group.minY = rect.minY;
    this.props.group.maxX = rect.maxX;
    this.props.group.maxY = rect.maxY;

    this.props.addGroupLocationCallback(this.props.group);

    let documentIDs = new Set();
    this.props.cards.forEach((card) => {
      documentIDs.add(card.documentID);
    });
    let representation = documentIDs.size;

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
              {options}
            </div>
          </div>
          <p>
            {representation} out of {this.props.totalCardCount}
          </p>
        </div>
      </>
    );
  }
}
