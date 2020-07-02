import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Delta from 'quill-delta';
import ContentEditable from 'react-contenteditable';

import LeftNav from './LeftNav.js';
import { useHistory } from "react-router-dom";

import { ThreeDotsVertical } from 'react-bootstrap-icons';




function initialDelta() {
  return new Delta([{ insert: "\n" }]);
}

export default class Documents extends React.Component {
  constructor(props) {
    super(props);

    this.documentsRef = props.documentsRef;

    this.createNewDocument = this.createNewDocument.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
    this.renameDocument = this.renameDocument.bind(this);

    this.state = {
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
              <DocumentCards documents={this.state.documents} deleteDocument={this.deleteDocument} renameDocument={this.renameDocument}/>
            </div>
        </div>
      </div>;
  }
}

function DocumentCards(props) {
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

    return <div key={documentID} className="listCard">
      <div className="listTitle">
        <div className="listTitleContainer">
          {title}
        </div>
        <div className="listTitleButtonContainer">
          <Dropdown>
            <Dropdown.Toggle variant="link" className="threedots">
              <ThreeDotsVertical/>
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
