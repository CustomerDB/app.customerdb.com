import React from 'react';
import Draggable from 'react-draggable';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import RBush from 'rbush';
import { v4 as uuidv4 } from 'uuid';
import rcolor from 'rcolor';

function getTextColorForBackground(hexcolor){
  hexcolor = hexcolor.replace("#", "");
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 170) ? '#000' : '#FFF';
}

function bboxToRect(bbox) {
  return {
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height
  };
}

function makeCard(data, bbox) {
  let card = bboxToRect(bbox);
  card.data = data;
  card.kind = "card";
  return card;
}

function circumscribingCircle(rect) {
  let width = rect.maxX - rect.minX;
  let height = rect.maxY - rect.minY;

  // compute the circle diameter
  let diameter = Math.sqrt(
    Math.pow(rect.maxX - rect.minX, 2) +
    Math.pow(rect.maxY - rect.minY, 2)
  );

  let radius = diameter / 2;

  let center = {
    x: rect.minX + width / 2,
    y: rect.minY + height / 2
  }

  let minX = center.x - radius;
  let minY = center.y - radius;

  return {
    minX: minX,
    minY: minY,
    maxX: minX + diameter,
    maxY: minY + diameter,
    diameter: diameter,
    radius: radius,
    center: center
  };
}

function Group(props) {
  if (props.groupObject === undefined) {
    return <div></div>
  }

  let circle = circumscribingCircle(props.groupObject);
  let color = props.groupObject.data.color;

  let border = `2px ${color} solid`;

  return <div
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
  </div>;
}

function HighlightModal(props) {
  if (props.data === undefined) {
    return <div></div>;
  }

  let rect = bboxToRect(props.bbox);

  let bboxText = JSON.stringify(props.bbox, null, 2);
  let rectText = JSON.stringify(rect, null, 2);

  let intersection = props.getIntersectingCallBack(
    props.bbox); // .map((item) => { return item.data.ID; });

  let intersectionText = JSON.stringify(intersection, null, 2);

  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.data['Note - Title']}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {props.data.Text}
        </p>
        <pre>
          id = {props.data.ID}
        </pre>
        <pre>
          bbox = {bboxText}
        </pre>
        <pre>
          rect = {rectText}
        </pre>
        <pre>
          intersection = {intersectionText}
        </pre>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}


class Card extends React.Component {
  constructor(props) {
    super(props);

    this.handleStart = this.handleStart.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleStop = this.handleStop.bind(this);
    this.showModal = this.showModal.bind(this);

    this.ref = React.createRef();

    this.oldBbox = undefined;

    this.state = {
      zIndex: 0,
      groupShape: undefined
    };
  }

  componentDidMount() {
    let target = this.ref.current;
    this.bbox = target.getBoundingClientRect();

    this.props.addLocationCallBack(
      this.props.data,
      this.bbox);
  }

  handleStart(e) {
    console.log("handleStart");
    this.setState({zIndex: 100});
    this.props.removeLocationCallBack(this.props.data, this.bbox);
  }

  handleDrag(e) {
    let bbox = this.ref.current.getBoundingClientRect();

    let cardGroupIDs = new Set();

    let intersections = this.props.getIntersectingCallBack(bbox);
    intersections.forEach((obj) => {
      if (obj.kind === "card") {
        cardGroupIDs.add(obj.data.groupID);
      }
    });

    let thisCardGroupID = this.props.data.groupID;

    if (cardGroupIDs.size != 1) {
      this.setState({ groupShape: undefined });
      if (thisCardGroupID !== undefined) {
        // This card has been dragged out of its own group
        this.props.removeFromGroupCallBack(this.props.data, this.bbox);
      }
      return;
    }

    let groupID = cardGroupIDs.values().next().value; // may be `undefined`

    if (thisCardGroupID !== undefined && thisCardGroupID !== groupID) {
      // This card has been dragged out of its own group
      this.props.removeFromGroupCallBack(this.props.data, this.bbox);
    }

    let thisRect = bboxToRect(bbox);
    let unionRect = Object.assign(thisRect, {});

    intersections.forEach((obj) => {
      if (obj.kind === "card" || obj.data.ID == groupID) {
        unionRect.minX = Math.min(unionRect.minX, obj.minX);
        unionRect.minY = Math.min(unionRect.minY, obj.minY);
        unionRect.maxX = Math.max(unionRect.maxX, obj.maxX);
        unionRect.maxY = Math.max(unionRect.maxY, obj.maxY);
      }
    });

    unionRect.data = { color: "#000" };

    this.setState({ groupShape: unionRect });
  }

  handleStop(e) {
    console.log("handleStop");
    this.bbox = this.ref.current.getBoundingClientRect();

    this.props.addLocationCallBack(
      this.props.data,
      this.bbox);

    this.props.printTree();
    this.setState({
      zIndex: 0,
      groupShape: undefined
    });
  }

  showModal() {
    this.props.modalCallBack(
      this.props.data,
      this.ref.current.getBoundingClientRect());
  }

  render() {
    return <><Draggable
      handle=".handle"
      bounds="parent"
      defaultPosition={{x: this.props.x, y: this.props.y}}
      position={null}
      scale={1}
      onStart={this.handleStart}
      onDrag={this.handleDrag}
      onStop={this.handleStop} >
        <div ref={this.ref} className="card" style={{zIndex: this.state.zIndex}} >
          <div
            className="handle titlebar"
            style={{
              backgroundColor: this.props.data.groupColor,
              color: this.props.data.textColor
            }}>
            {this.props.data['Note - Title']}
          </div>
          <div className="quote" onClick={this.showModal}>{this.props.data['Text']}</div>
        </div>
    </Draggable>
    <Group groupObject={this.state.groupShape} />
    </>;
  }
}

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    this.tag = props.tag;
    this.dataset = props.datasetRef;
    this.state = {
      isDataLoaded: false,
      highlights: [],
      modalShow: false,
      modalData: undefined,
      modalBbox: undefined,

      // Groups is indexed by groupID, and contains data
      // that looks like this:
      //
      // groups: {
      //   foo: {
      //     data: {
      //       name: "foo",
      //       cards: []
      //     },
      //     kind: "group",
      //     minX: 0,
      //     minY: 0,
      //     maxX: 0,
      //     maxY: 0
      //   }
      // }
      groups: {}
    }

    this.rtree = new RBush(4);

    this.printTree = this.printTree.bind(this);

    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);
    this.removeCardLocationFromGroup = this.removeCardLocationFromGroup.bind(this);

    this.addGroupLocation = this.addGroupLocation.bind(this);
    this.removeGroupLocation = this.removeGroupLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
    this.getIntersectingGroups = this.getIntersectingGroups.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);

    this.addCardToGroup = this.addCardToGroup.bind(this);
    this.removeCardFromGroup = this.removeCardFromGroup.bind(this);
    this.createGroup = this.createGroup.bind(this);

    this.groupsForBbox = this.groupsForBbox.bind(this);
  }

  componentDidMount() {
    this.dataset.collection('highlights').where("Tag", "==", this.tag).onSnapshot(
      (
        function(querySnapshot) {
          var highlights = [];
          querySnapshot.forEach((doc) => {
            let data = doc.data();
            data['ID'] = doc.id;
            highlights.push(data);
          });
          this.setState({ highlights: highlights });
        }
      ).bind(this)
    );
  }

  addCardToGroup(groupID, card) {
    let groups = this.state.groups;
    let group = groups[groupID];

    card.data.groupID = group.data.ID;
    card.data.groupColor = group.data.color;
    card.data.textColor = group.data.textColor;

    // Delete old group record from rtree
    this.removeGroupLocation(group);

    // Update group bounding box
    group.minX = Math.min(group.minX, card.minX);
    group.minY = Math.min(group.minY, card.minY);
    group.maxX = Math.max(group.maxX, card.maxX);
    group.maxY = Math.max(group.maxY, card.maxY);

    group.data.cards.push(card);

    // Re-insert group into rtree and re-render
    this.addGroupLocation(group);
    this.setState({ groups: groups });
  }

  removeCardFromGroup(card) {
    if (card.data.groupID === undefined) {
      return;
    }

    let groupID = card.data.groupID;
    let groups = this.state.groups;
    let group = groups[groupID];

    card.data.groupID = undefined;
    card.data.groupColor = "#000";
    card.data.textColor = "#FFF";

    group.data.cards = group.data.cards.filter((e) => { return e.data.ID !== card.data.ID});

    // Delete old group record from rtree
    this.removeGroupLocation(group);

    if (group.data.cards.length > 1) {
       // Update group bounding box
      group.minX = group.data.cards[0].minX;
      group.minY = group.data.cards[0].minY;
      group.maxX = group.data.cards[0].maxX
      group.maxY = group.data.cards[0].maxY;

      group.data.cards.forEach((card) => {
        group.minX = Math.min(group.minX, card.minX);
        group.minY = Math.min(group.minY, card.minY);
        group.maxX = Math.max(group.maxX, card.maxX);
        group.maxY = Math.max(group.maxY, card.maxY);
      });

      // Re-insert group into rtree and re-render
      this.addGroupLocation(group);
    } else {
      // Remove group
      group.data.cards.forEach((card) => {
        this.removeCardFromGroup(card);
      })
      delete groups[groupID];
    }

    this.setState({ groups: groups });
  }

  createGroup(cards) {
    let id = uuidv4();
    let card = cards[0];
    let color = rcolor();
    let textColor = getTextColorForBackground(color);
    this.state.groups[id] = {
        minX: card.minX,
        minY: card.minY,
        maxX: card.maxX,
        maxY: card.maxY,
        kind: "group",
        data: {
          ID: id,
          name: "Unnamed group",
          color: color,
          textColor: textColor,
          cards: []
        }
      }

    cards.forEach((card) => {
      this.addCardToGroup(id, card);
    })
  }

  groupsForBbox(bbox) {
    let intersections = this.getIntersectingCards(bbox);
    let groups = intersections.flatMap((c) => {
      let groupID = c.data.groupID;
      return (groupID === undefined) ? [] : [this.state.groups[groupID]];
    });
    return groups;
  }

  addCardLocation(data, bbox) {
    // @pre:
    //
    // data has a field called ID
    //
    // rect looks like this:
    // {"x":307,"y":317,"width":238,"height":40,"top":317,"right":545,"bottom":357,"left":307}
    let card = bboxToRect(bbox);
    card.data = data;
    card.kind = "card";

    let groups = this.groupsForBbox(bbox);
    if (groups.length == 0) {
      this.removeCardFromGroup(card);
      let intersections = this.getIntersectingCards(bbox);
      if (intersections.length > 0) {
        // Create a new group
        intersections.push(card);
        this.createGroup(intersections);
      }
    }
    if (groups.length == 1) {
      let group = groups[0];
      if (card.data.groupID !== group.data.ID) {
        this.removeCardFromGroup(card);
      }
      this.addCardToGroup(group.data.ID, card);
    }
    if (groups.length > 1) {
      console.error("Unsupported group merge via drag: groups: ", groups.map((g) => { return g.data.ID; }));
    }

    this.rtree.insert(card);
  }

  removeCardLocationFromGroup(data, bbox) {
    // Remove this card from a group (if it's part of a group)
    let card = makeCard(data, bbox);
    this.removeCardFromGroup(card);
  }

  removeCardLocation(data, bbox) {
    // @pre:
    //
    // data has a field called ID
    console.log("Removing card with id", data.ID);

    let card = makeCard(data, bbox);

    this.rtree.remove(
      card,
      (a, b) => {
        if (a.kind !== "card" || b.kind !== "card") {
          return false;
        }
        return a.data.ID === b.data.ID;
      }
    );
  }

  addGroupLocation(group) {
    // @pre:
    //
    // data has a field called name
    console.log("Inserting group ", group);

    this.rtree.insert(group);
  }

  removeGroupLocation(group) {
    // @pre:
    //
    // data has a field called id
    console.log("Removing group with id", group.data.ID);

    this.rtree.remove(
      group,
      (a, b) => {
        // console.log("comparing", a.data.ID, b.data.ID);
        if (a.kind !== "group" || b.kind !== "group") return false;
        return a.data.ID === b.data.ID;
      }
    );
  }

  printTree() {
    console.log(this.rtree.all().length);
  }

  getIntersecting(bbox) {
    let query = bboxToRect(bbox);
    return this.rtree.search(query);
  }

  getIntersectingGroups(bbox) {
    return this.getIntersecting(bbox).filter((item) => {
      return item.kind === "group";
    });
  }

  getIntersectingCards(bbox) {
    return this.getIntersecting(bbox).filter((item) => {
      return item.kind === "card";
    });
  }

  modalCallBack(data, bbox) {
    this.setState({
      modalShow: true,
      modalData: data,
      modalBbox: bbox,
    })
  }

  render() {
    let cards = [];
    for (let i=0; i<this.state.highlights.length; i++) {
      let h = this.state.highlights[i];
      let y = 40 + i * 30;

      cards.push(<Card
        key={h.ID}
        x={0}
        y={y}
        data={h}
        modalCallBack={this.modalCallBack}
        addLocationCallBack={this.addCardLocation}
        removeLocationCallBack={this.removeCardLocation}
        removeFromGroupCallBack={this.removeCardLocationFromGroup}
        getIntersectingCallBack={this.getIntersecting}
        printTree={this.printTree}
      />);
    }

    console.log("groups", this.state.groups);

    let groups = Object.values(this.state.groups).map((g) => {
      return <Group groupObject={g}/>
    });

    return <><div className="cardContainer fullHeight">
      {groups}
      {cards}
    </div>
    <HighlightModal
      show={this.state.modalShow}
      data={this.state.modalData}
      bbox={this.state.modalBbox}
      getIntersectingCallBack={this.getIntersecting}
      onHide={() => this.setState({'modalShow': false})}
    />
    </>;
  }
}
