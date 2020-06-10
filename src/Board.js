import React from 'react';
import Draggable from 'react-draggable';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import RBush from 'rbush';

function HighlightModal(props) {
  if (props.data === undefined) {
    return <div></div>;
  }

  let rect = {
      minX: props.bbox.x,
      minY: props.bbox.y,
      maxX: props.bbox.x + props.bbox.width,
      maxY: props.bbox.y + props.bbox.height
  };

  let bboxText = JSON.stringify(props.bbox, null, 2);
  let rectText = JSON.stringify(rect, null, 2);

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
          bbox = {bboxText}
        </pre>
        <pre>
          rect = {rectText}
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

    this.state = {zIndex: 0};
  }

  componentDidMount() {
    let target = this.ref.current;
    let bbox = target.getBoundingClientRect();

    this.props.updateLocationCallBack(
      this.props.data,
      bbox);
  }

  handleStart(e) {
    console.log("handleStart");
    this.setState({zIndex: 100});
  }

  handleDrag(e) {
    let bbox = e.target.getBoundingClientRect();

    let intersections = this.props.getIntersectingCallBack(
      this.props.data.ID,
      bbox);

    if (intersections.length > 0) {
      console.log(intersections.map((e) => { return e.ID; }));
    }
  }

  handleStop(e) {
    console.log("handleStop");
    let bbox = e.target.getBoundingClientRect();

    this.props.updateLocationCallBack(
      this.props.data,
      bbox);

    this.props.printTree();
    this.setState({zIndex: 0});
  }

  showModal() {
    this.props.modalCallBack(
      this.props.data,
      this.ref.current.getBoundingClientRect());
  }

  render() {
    return <Draggable
      handle=".handle"
      bounds="parent"
      defaultPosition={{x: 0, y: 0}}
      position={null}
      scale={1}
      onStart={this.handleStart}
      onDrag={this.handleDrag}
      onStop={this.handleStop} >
        <div ref={this.ref} className="card" style={{zIndex: this.state.zIndex}} >
          <div className="handle titlebar"><b>{this.props.data['Note - Title']}</b></div>
          <div className="quote" onClick={this.showModal}>{this.props.data['Text']}</div>
        </div>
    </Draggable>;
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

    this.updateCardLocation = this.updateCardLocation.bind(this);

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

  updateCardLocation(data, rect) {
    // @pre:
    //
    // data has a field called ID
    //
    // rect looks like this:
    // {"x":307,"y":317,"width":238,"height":40,"top":317,"right":545,"bottom":357,"left":307}

    console.log("Inserting card with id", data.ID);

    this.rtree.remove(
      { data: { ID: data.ID} },
      (a, b) => { return a.data.ID === b.data.ID; });

    this.rtree.insert({
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height,
      data: data
    });
  }

  printTree() {
    // console.log(JSON.stringify(this.rtree.toJSON()));
  }

  getIntersectingCards(id, rect) {
    let results = this.rtree.search({
      minX: rect.x,
      minY: rect.y,
      maxX: rect.x + rect.width,
      maxY: rect.y + rect.height
    });

    let items = [];
    for (var i=0; i<results.length; i++) {
      if (results[i].data.ID !== id) {
        items.push(results[i].data);
      }
    }

    return items;
  }

  modalCallBack(data, bbox) {
    this.setState({
      modalShow: true,
      modalData: data,
      modalBbox: bbox,
    })

    console.log("Should show modal");
  }

  render() {
    return <><div className="cardContainer fullHeight">
      {this.state.highlights.map((h) => {
        return <Card
          key={h.ID}
          data={h}
          modalCallBack={this.modalCallBack}
          updateLocationCallBack={this.updateCardLocation}
          getIntersectingCallBack={this.getIntersectingCards}
          printTree={this.printTree}
          />;
      })}
    </div>
    <HighlightModal
      show={this.state.modalShow}
      data={this.state.modalData}
      bbox={this.state.modalBbox}
      onHide={() => this.setState({'modalShow': false})}
    />
    </>;
  }
}
