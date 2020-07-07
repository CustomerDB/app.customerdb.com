import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Delta from 'quill-delta';

import LeftNav from './LeftNav.js';
import Document from './Document.js';

import { useHistory, withRouter } from "react-router-dom";

import { ThreeDotsVertical } from 'react-bootstrap-icons';

function initialDelta() {
  return new Delta([{ insert: "\n" }]);
}

class Documents extends React.Component {
  constructor(props) {
    super(props);

    this.documentsRef = props.documentsRef;

    this.createNewDocument = this.createNewDocument.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
    this.renameDocument = this.renameDocument.bind(this);

    this.state = {
      documentID: undefined,
      documents: []
    }
  }

  componentDidMount() {
    this.documentsRef.where("owners", "array-contains", this.props.user.uid).onSnapshot((snapshot) => {
      let docs = [];

      snapshot.forEach((doc) => {
        let data = doc.data();
        data['ID'] = doc.id;
        docs.push(data);
      });

      this.setState({
        documents: docs
      })
    });

    let documentID = this.props.match.params.id;
    this.setState({
      documentID: documentID
    });
  }

  componentWillReceiveProps(newProps) {
    let documentID = newProps.match.params.id;
    this.setState({
      documentID: documentID
    });
  }

  createNewDocument() {
    console.log("documentsRef", this.documentsRef);
    this.documentsRef.add({
      title: "Untitled Document",
      owners: [this.props.user.uid]
    }).then(newDocRef => {
      let delta = initialDelta();
      newDocRef.collection('deltas')
        .doc()
        .set({
          userID: this.props.user.uid,
          ops: delta.ops,
          id: "",
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    });
  }

  renameDocument(id, newTitle) {
    this.documentsRef.doc(id).set({
      title: newTitle
    }, {merge: true});
  }

  deleteDocument(id) {
    this.documentsRef.doc(id).delete();
  }

  render() {
    let view = <></>;
    if (this.state.documentID !== undefined) {
      console.log(`this.state.documentID ${this.state.documentID}`)
      view = <Document documentID={this.state.documentID} documentsRef={this.props.documentsRef} user={this.props.user} logoutCallback={this.props.logout} />;
    }

    return <div className="navContainer">
        <LeftNav active="documents" logoutCallback={this.props.logoutCallback}/>
        <div className="navBody">
            <div className="listContainer">
              <div className="listTitle">
                <div className="listTitleContainer">
                  <h3>Documents</h3>
                </div>
                <div className="listTitleButtonContainer">
                  <Button className="addButton" onClick={this.createNewDocument}>+</Button>
                </div>
              </div>
              <br/>
              <DocumentCards documentID={this.state.documentID} documents={this.state.documents} deleteDocument={this.deleteDocument} renameDocument={this.renameDocument}/>
            </div>
            {view}
        </div>
      </div>;
  }
}

function DocumentCards(props) {
  console.log("Rerender cards..");
  let history = useHistory();

  const [edit, setEdit] = useState(undefined);
  const [editValue, setEditValue] = useState("");

  let documentRows = props.documents.map((d) => {
    let title = <p onClick={() => {
      history.push(`/document/${documentID}`);
    }} className="listCardTitle">{d.title}</p>;
    if (edit == d.ID) {
      d.ref = React.createRef();
      title = <input type="text" onBlur={(e) => {
          props.renameDocument(d.ID, editValue);
          setEdit(undefined);
          setEditValue("");
        }} onChange={(e) => {
          setEditValue(e.target.value);
        }}
        defaultValue={d.title}/>;
    }

    let documentID = d.ID;
    let listCardClass = "listCard";
    let threedots = <ThreeDotsVertical/>;

    if (props.documentID == documentID) {
      listCardClass = "listCardActive";
      threedots = <ThreeDotsVertical color="white"/>;
    }

    return <div key={documentID} className={listCardClass}>
      <div className="listTitle">
        <div className="listTitleContainer">
          {title}
        </div>
        <div className="listTitleButtonContainer">
          <Dropdown>
            <Dropdown.Toggle variant="link" className="threedots">
              {threedots}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => {
                setEdit(documentID);
                setEditValue(d.title);
              }}>Rename</Dropdown.Item>
              <Dropdown.Item onClick={() => {props.deleteDocument(documentID)}}>Delete</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>
    </div>;
  });

  return <>{documentRows}</>;
}

export default withRouter(Documents);
