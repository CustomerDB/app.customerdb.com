import React from 'react';
import Draggable from 'react-draggable';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';


function HighlightModal(props) {
  if (props.data == undefined) {
    console.log("Data is not set: " + JSON.stringify(props));
    return <div></div>;
  }

  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.data['Note - Title']}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          {props.data['Text']}
        </p>
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
  }

  handleStart() {
    console.log("handleStart");
  }

  handleDrag() {
    console.log("handleDrag");
  }

  handleStop() {
    console.log("handleStop");
  }

  render() {
    return <Draggable
      handle=".handle"
      defaultPosition={{x: 0, y: 0}}
      position={null}
      scale={1}
      onStart={this.handleStart}
      onDrag={this.handleDrag}
      onStop={this.handleStop}>
      <div className="card">
        <div className="handle titlebar"><b>{this.props.data['Note - Title']}</b></div>
        <div className="quote" onClick={() => {this.props.modalCallBack(this.props.data)}}>{this.props.data['Text']}</div>
      </div>
    </Draggable>;
  }
}

export default class DatasetTabPane extends React.Component {
  constructor(props) {
    super(props);
    this.tag = props.tag;
    this.dataset = props.datasetRef;
    this.state = {
      isDataLoaded: false,
      highlights: [],
      modalShow: false,
      modalData: undefined
    }

    this.modalCallBack = this.modalCallBack.bind(this);
  }

  componentDidMount() {
    this.dataset.collection('highlights').where("Tag", "==", this.tag).onSnapshot(
      (
        function(querySnapshot) {
          var highlights = [];
          querySnapshot.forEach(
            function(doc) {
              let data = doc.data();
              highlights.push(data);
            }
          );

          this.setState({ highlights: highlights });
        }
      ).bind(this)
    );
  }

  modalCallBack(data) {
    this.setState({
      'modalShow': true,
      'modalData': data
    })

    console.log("Should show modal");
  }

  render() {
    return <div><div className="cardContainer">
      {this.state.highlights.map((e) => {
        return <Card data={e} modalCallBack={this.modalCallBack}/>;
      })}
    </div>
    <HighlightModal
      show={this.state.modalShow}
      data={this.state.modalData}
      onHide={() => this.setState({'modalShow': false})}
    />
    </div>;
  }
}
