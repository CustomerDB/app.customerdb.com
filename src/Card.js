import React from 'react';
import Draggable from 'react-draggable';

import { bboxToRect, circumscribingCircle } from './geom.js';

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
      zIndex: 0
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

  componentWillUnmount() {
    this.props.removeLocationCallBack(this.props.card);
  }

  handleStart(e) {
    this.setState({zIndex: 100});
    this.props.removeLocationCallBack(this.props.card);
  }

  handleDrag(e) {
    let rect = this.getRect();

    let cardGroupIDs = new Set();
    let cardGroupColor = "#000";

    let intersections = this.props.getIntersectingCardsCallBack(rect);

    console.log("handleDrag (intersections)\n", intersections);

    // Nothing to do
    if (intersections.length === 0) {
      this.setState({
        previewCircle: undefined,
        previewColor: undefined
      });
      return;
    }

    intersections.forEach((card) => {
      cardGroupIDs.add(card.data.groupID);
    });

    console.log("handleDrag (cardGroupIDs)\n", cardGroupIDs);

    // Check whether we are intersecting cards of more than one
    // group. (Includes case where we are intersecting an ungrouped
    // card and a grouped card.)
    if (cardGroupIDs.size !== 1) {
      this.setState({
        previewCircle: undefined,
        previewColor: undefined
      });
      return;
    }

    let groupID = cardGroupIDs.values().next().value; // may be `undefined`

    console.log("handleDrag (groupID)\n", groupID);

    // Check whether the intersecting cards are not already part
    // of a group, in which case we would create a new group if
    // dropped here
    if (groupID !== undefined) {
      let intersectingGroups = this.props.getIntersectingGroupsCallBack(rect);
      intersectingGroups.forEach((group) => {
        if (group.data.ID === groupID) {
          cardGroupColor = group.data.color;
          intersections.push(group);
        }
      });
    }

    intersections.push(rect);

    let bounds = Object.assign({}, rect);
    intersections.forEach((o) => {
      bounds.minX = Math.min(bounds.minX, o.minX);
      bounds.minY = Math.min(bounds.minY, o.minY);
      bounds.maxX = Math.max(bounds.maxX, o.maxX);
      bounds.maxY = Math.max(bounds.maxY, o.maxY);
    });

    let circle = circumscribingCircle(bounds);

    this.setState({
      previewCircle: circle,
      previewColor: cardGroupColor
    });

  }

  handleStop(e) {
    this.rect = this.getRect();

    Object.assign(this.props.card, this.rect);

    // Update group membership based on location.
    let groupData = this.props.groupDataForCardCallback(this.props.card);
    if (groupData.ID === undefined) {
      delete this.props.card.data['groupID'];
    } else {
      this.props.card.data.groupID = groupData.ID;
    }
		this.props.card.data.groupColor = groupData.color;
		this.props.card.data.textColor = groupData.textColor;

    this.props.addLocationCallBack(this.props.card);

    this.setState({
      zIndex: 0,
      previewCircle: undefined,
      previewColor: undefined
    });

    this.cardRef.set(this.props.card);
  }

  showModal() {
    this.props.modalCallBack(
      this.props.card.data,
      this.props.card,
      this.ref.current.getBoundingClientRect());
  }

  render() {
    let titleBarColor = this.props.groupColor;
    let titleBarTextColor = this.props.textColor;

    let divStyle = {
      zIndex: this.state.zIndex
    }

		let position = {
			x: this.props.minX,
			y: this.props.minY
		}

    let groupPreview = this.state.previewCircle === undefined
      ? <></>
      : <div
          className="groupLabel"
          style={{
            position: "absolute",
            left: this.state.previewCircle.minX,
            top: this.state.previewCircle.minY,
            height: this.state.previewCircle.diameter,
            width: this.state.previewCircle.diameter,
            borderRadius: "50%",
            border: `3px solid ${this.state.previewColor}`
          }} />;

    console.debug("Card.render (state)", this.state);

		// Draggable nodeRef required to fix findDOMNode warnings.
		// see: https://github.com/STRML/react-draggable/pull/478
    return <><Draggable
			nodeRef={this.ref}
      handle=".handle"
      bounds="parent"
      position={position}
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

    {groupPreview}
    </>;
  }
}

