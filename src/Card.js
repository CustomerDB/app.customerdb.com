import React from 'react';
import Draggable from 'react-draggable';

import { bboxToRect } from './geom.js';

export default class Card extends React.Component {
  constructor(props) {
    super(props);

    this.handleStart = this.handleStart.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleStop = this.handleStop.bind(this);
    this.showModal = this.showModal.bind(this);
    this.getRect = this.getRect.bind(this);

		// This is a react handle to the rendered dom element
    this.ref = React.createRef();

		// This is a reference to a document in firestore database
		this.cardRef = this.props.cardRef;

    this.state = {
      zIndex: 0,
      groupShape: undefined
    };
  }

  getRect() {
    return bboxToRect(this.ref.current.getBoundingClientRect());
  }

  componentDidMount() {
    this.rect = this.getRect();
    Object.assign(this.props.card, this.rect);
    this.cardRef.set(this.props.card);
    this.props.addLocationCallBack(this.props.card);
  }

  handleStart(e) {
    console.log("handleStart");
    this.setState({zIndex: 100});
    this.props.removeLocationCallBack(this.props.card.data, this.rect);
  }

  handleDrag(e) {
    /*
    let rect = this.getRect();

    let cardGroupIDs = new Set();
    let cardGroupColor = "#000";
    let cardGroupTextColor = "#FFF";

    let intersections = this.props.getIntersectingCallBack(rect);
    intersections.forEach((obj) => {
      if (obj.kind === "card") {
        cardGroupIDs.add(obj.data.groupID);
        if (obj.data.groupID !== undefined) {
          cardGroupColor = obj.data.groupColor;
          cardGroupTextColor = obj.data.textColor;
        }
      }
    });

    let thisCardGroupID = this.props.highlight.groupID;

    if (cardGroupIDs.size !== 1) {
      this.setState({
        groupShape: undefined,
        previewColor: undefined,
        previewTextColor: undefined
      });
      return;
    }

    let groupID = cardGroupIDs.values().next().value; // may be `undefined`

    let unionRect = Object.assign(rect, {});

    intersections.forEach((obj) => {
      if (obj.kind === "card" || obj.data.ID === groupID) {
        unionRect.minX = Math.min(unionRect.minX, obj.minX);
        unionRect.minY = Math.min(unionRect.minY, obj.minY);
        unionRect.maxX = Math.max(unionRect.maxX, obj.maxX);
        unionRect.maxY = Math.max(unionRect.maxY, obj.maxY);
      }
    });

    unionRect.data = { color: cardGroupColor };

    this.setState({
      groupShape: unionRect,
      previewColor: cardGroupColor,
      previewTextColor: cardGroupTextColor
    });
    */
  }

  handleStop(e) {
    console.log("handleStop");
    this.rect = this.getRect();

    Object.assign(this.props.card, this.rect);
    this.cardRef.set(this.props.card);
    this.props.addLocationCallBack(this.props.card);

    this.setState({
      zIndex: 0,
      groupShape: undefined,
      previewColor: undefined,
      previewTextColor: undefined
    });
  }

  showModal() {
    this.props.modalCallBack(
      this.props.card.data,
      this.props.card,
      this.ref.current.getBoundingClientRect());
  }

  render() {
    let titleBarColor = this.props.card.data.groupColor;
    let titleBarTextColor = this.props.card.data.textColor;

    let divStyle = {
      zIndex: this.state.zIndex
    }

		let defaultPos = {
			x: this.props.card.minX,
			y: this.props.card.minY
		}


    return <><Draggable
      handle=".handle"
      bounds="parent"
      defaultPosition={defaultPos}
      position={null}
      scale={1}
      onStart={this.handleStart}
      onDrag={this.handleDrag}
      onStop={this.handleStop} >
        <div ref={this.ref} className="card" style={divStyle} >
          <div
            className="handle titlebar"
            style={{
              backgroundColor: titleBarColor,
              color: titleBarTextColor
            }}>
            {this.props.card.data['Note - Title']}
          </div>
          <div className="quote" onClick={this.showModal}>{this.props.card.data['Text']}</div>
        </div>
    </Draggable>
    </>;
  }
}
