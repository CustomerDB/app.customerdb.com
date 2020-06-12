import React from 'react';
import Draggable from 'react-draggable';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import RBush from 'rbush';

function bboxToRect(bbox) {
  return {
      minX: bbox.x,
      minY: bbox.y,
      maxX: bbox.x + bbox.width,
      maxY: bbox.y + bbox.height
  };
}

function Group(props) {
  let rect = props.groupObject;

  if (rect === undefined) {
    return <div></div>
  }

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

  return <div style={{
    position: "absolute",
    top: center.y - radius,
    left: center.x - radius,
    width: diameter,
    height: diameter,
    borderRadius: "50%",
    border: "2px green solid"
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
    props.bbox).map((item) => { return item.data.ID; });

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

    let intersections = this.props.getIntersectingCallBack(bbox);

    if (intersections.length > 0) {

      console.log("intersecting kinds:", intersections.map((i) => {return i.kind}));

      let thisRect = bboxToRect(bbox);
      let unionRect = Object.assign(thisRect, {});

      intersections.forEach((otherRect) => {
        unionRect.minX = Math.min(unionRect.minX, otherRect.minX);
        unionRect.minY = Math.min(unionRect.minY, otherRect.minY);
        unionRect.maxX = Math.max(unionRect.maxX, otherRect.maxX);
        unionRect.maxY = Math.max(unionRect.maxY, otherRect.maxY);
      });

      this.setState({ groupShape: unionRect });
    }
    else {
      this.setState({ groupShape: undefined });
    }
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
          <div className="handle titlebar"><b>{this.props.data['Note - Title']}</b></div>
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

      // Groups is indexed by groupName, and contains data
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

    this.addGroupLocation = this.addGroupLocation.bind(this);
    this.removeGroupLocation = this.removeGroupLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
    this.getIntersectingGroups = this.getIntersectingGroups.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);
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

  addCardLocation(data, bbox) {
    // @pre:
    //
    // data has a field called ID
    //
    // rect looks like this:
    // {"x":307,"y":317,"width":238,"height":40,"top":317,"right":545,"bottom":357,"left":307}
    console.log("Inserting card with id", data.ID);
    let card = bboxToRect(bbox);
    card.data = data;
    card.kind = "card";

    // find cards that intersect this new card
    let intersections = this.getIntersectingCards(bbox);

    if (intersections.length > 0) {
      // if the cards are already in a group, join that group
      // NOTE: merging two groups with a new card insertion is not supported.
      let groups = this.state.groups;

      let groupName = intersections[0].data.groupName;
      if (groupName !== undefined) {
        card.data.groupName = groupName;
        let group = groups[groupName];

        // Delete old group record from rtree
        this.removeGroupLocation(group);

        // Update group bounding box
        group.minX = Math.min(group.minX, card.minX);
        group.minY = Math.min(group.minY, card.minY);
        group.maxX = Math.max(group.maxX, card.maxX);
        group.maxY = Math.max(group.maxY, card.maxY);

        card.data.groupName = groupName;
        group.data.cards.push(card);

        // Re-insert group into rtree and re-render
        this.addGroupLocation(group);
        this.setState({ groups: groups });
      }

      // if no group exists, create a new group
      else {
        let group = {
          minX: card.minX,
          minY: card.minY,
          maxX: card.maxX,
          maxY: card.maxY,
          kind: "group",
          data: {
            name: "Unnamed group"
          }
        }

        intersections.forEach((otherCard) => {
          group.minX = Math.min(group.minX, otherCard.minX);
          group.minY = Math.min(group.minY, otherCard.minY);
          group.maxX = Math.max(group.maxX, otherCard.maxX);
          group.maxY = Math.max(group.maxY, otherCard.maxY);
        });

        intersections.push(card);
        group.data.cards = intersections;

        // Write group name into all cards
        group.data.cards.forEach((c) => {
          c.data.groupName = group.data.name;
        });

        // Re-insert group into rtree and re-render
        this.addGroupLocation(group);

        groups[group.data.name] = group;
        this.setState({ groups: groups });
      }
    }

    this.rtree.insert(card);
  }

  removeCardLocation(data, bbox) {
    // @pre:
    //
    // data has a field called ID
    console.log("Removing card with id", data.ID);

    let item = bboxToRect(bbox);
    item.data = data;
    item.kind = "card";

    this.rtree.remove(
      item,
      (a, b) => {
        if (a.kind !== "card" || b.kind !== "card") {
          // console.log("not cards?\n", JSON.stringify(a), JSON.stringify(b));
          return false;
        }
        let result = a.data.ID === b.data.ID;
        return result
      }
    );
  }

  addGroupLocation(group) {
    // @pre:
    //
    // data has a field called name
    console.log("Inserting group with name", group.data.name);

    this.rtree.insert(group);
  }

  removeGroupLocation(group) {
    // @pre:
    //
    // data has a field called name
    console.log("Removing group with name", group.data.name);

    this.rtree.remove(
      group,
      (a, b) => {
        // console.log("comparing", a.data.ID, b.data.ID);
        if (a.kind !== "group" || b.kind !== "group") return false;
        return a.data.name === b.data.name;
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
        getIntersectingCallBack={this.getIntersectingCards}
        printTree={this.printTree}
      />);
    }

    console.log("groups", this.state.groups);

    let groups = Object.values(this.state.groups).map((g) => {
      return <Group groupObject={g} />
    });

    return <><div className="cardContainer fullHeight">
      {cards}
      {groups}
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
