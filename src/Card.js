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

    this.ref = React.createRef();

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

    this.props.addLocationCallBack(
      this.props.highlight,
      this.rect);
  }

  handleStart(e) {
    console.log("handleStart");
    this.setState({zIndex: 100});
    this.props.removeLocationCallBack(this.props.highlight, this.rect);
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

    this.props.addLocationCallBack(
      this.props.highlight,
      this.rect);

    this.setState({
      zIndex: 0,
      groupShape: undefined,
      previewColor: undefined,
      previewTextColor: undefined
    });
  }

  showModal() {
    this.props.modalCallBack(
      this.props.highlight,
      this.props.card,
      this.ref.current.getBoundingClientRect());
  }

  render() {
    let titleBarColor = this.state.previewColor !== undefined ? this.state.previewColor : this.props.highlight.groupColor;
    let titleBarTextColor = this.state.previewTextColor !== undefined ? this.state.previewTextColor : this.props.highlight.textColor;

    let divStyle = {
      zIndex: this.state.zIndex
    }

    return <><Draggable
      handle=".handle"
      bounds="parent"
      defaultPosition={this.props.defaultPos}
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
            {this.props.highlight['Note - Title']}
          </div>
          <div className="quote" onClick={this.showModal}>{this.props.highlight['Text']}</div>
        </div>
    </Draggable>
    </>;
  }
}

