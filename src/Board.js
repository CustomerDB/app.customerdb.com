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

function rectToDiv(rect) {
  if (rect == undefined) {
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
    props.data.ID,
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

    let intersections = this.props.getIntersectingCallBack(
      this.props.data.ID,
      bbox);

    if (intersections.length > 0) {
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
      defaultPosition={{x: 0, y: 40}}
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
    {rectToDiv(this.state.groupShape)}
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
      modalBbox: undefined
    }

    this.rtree = new RBush(4);

    this.printTree = this.printTree.bind(this);
    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
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
    let item = bboxToRect(bbox);
    item.data = data;
    this.rtree.insert(item);
  }

  removeCardLocation(data, bbox) {
    // @pre:
    //
    // data has a field called ID
    console.log("Removing card with id", data.ID);

    let item = bboxToRect(bbox);
    item.data = data;

    this.rtree.remove(
      item,
      (a, b) => {
        // console.log("comparing", a.data.ID, b.data.ID);
        return a.data.ID == b.data.ID;
      }
    );
  }

  printTree() {
    console.log(this.rtree.all().length);
  }

  getIntersectingCards(id, bbox) {
    let query = bboxToRect(bbox);
    return this.rtree.search(query);
  }

  modalCallBack(data, bbox) {
    this.setState({
      modalShow: true,
      modalData: data,
      modalBbox: bbox,
    })
  }

  render() {
    return <><div className="cardContainer fullHeight">
      {this.state.highlights.map((h) => {
        return <Card
          key={h.ID}
          data={h}
          modalCallBack={this.modalCallBack}
          addLocationCallBack={this.addCardLocation}
          removeLocationCallBack={this.removeCardLocation}
          getIntersectingCallBack={this.getIntersectingCards}
          printTree={this.printTree}
          />;
      })}
    </div>
    <HighlightModal
      show={this.state.modalShow}
      data={this.state.modalData}
      bbox={this.state.modalBbox}
      getIntersectingCallBack={this.getIntersectingCards}
      onHide={() => this.setState({'modalShow': false})}
    />
    </>;
  }
}
