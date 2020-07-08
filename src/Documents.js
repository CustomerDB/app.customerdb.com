import React, { useState } from 'react';

import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Delta from 'quill-delta';

import LeftNav from './LeftNav.js';
import Document from './Document.js';

import { useNavigate, useParams } from "react-router-dom";

import { ThreeDotsVertical } from 'react-bootstrap-icons';

function initialDelta() {
  return new Delta([{ insert: "" }]);
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
    this.documentsRef
      .where("owners", "array-contains", this.props.user.ID)
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
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

    let { id } = useParams();
    let documentID = id;
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
      owners: [this.props.user.ID],
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: ""
    }).then(newDocRef => {
      let delta = initialDelta();
      newDocRef.collection('deltas')
        .doc()
        .set({
          userID: this.props.user.ID,
          ops: delta.ops,
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
    // TODO(CD): Add periodic job to garbage-collect documents after some
    //           reasonable grace period.
    //
    // TODO(CD): Add some way to recover deleted documents that are still
    //           within the grace period.
    this.documentsRef.doc(id).update({
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  render() {
    let view = <></>;
    if (this.state.documentID !== undefined) {
      console.log(`this.state.documentID ${this.state.documentID}`)
      view = <Document key={this.state.documentID} documentID={this.state.documentID} documentsRef={this.props.documentsRef} user={this.props.user} logoutCallback={this.props.logout} />;
    }

    return <div className="navContainer">
        <LeftNav active="documents" logoutCallback={this.props.logoutCallback}/>
        <Container className="navBody">
          <Row>
            <Col md={4}>
              <Row mb={10}>
                <Col md={10}>
                  <h3>Documents</h3>
                </Col>
                <Col md={2}>
                  <Button className="addButton" onClick={this.createNewDocument}>+</Button>
                </Col>
              </Row>
              <DocumentList documentID={this.state.documentID} documents={this.state.documents} deleteDocument={this.deleteDocument} renameDocument={this.renameDocument}/>
            </Col>
            <Col md={8}>
            {view}
            </Col>
          </Row>
        </Container>
      </div>;
  }
}

function DocumentList(props) {
  console.log("Rerender cards..");
  let navigate = useNavigate();

  const [edit, setEdit] = useState(undefined);
  const [editValue, setEditValue] = useState("");

  let documentRows = props.documents.map((d) => {
    let title = <p onClick={() => {
      navigate(`/document/${documentID}`);
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

    return <Row key={documentID}>
        <Col>
        <Container className={listCardClass}>
          <Row>
            <Col className="listTitleContainer" md={10}>
              {title}
            </Col>
            <Col md={2}>
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
            </Col>
          </Row>
          </Container>
          </Col>
        </Row>;
  });

  return <Row><Col>{documentRows}</Col></Row>;
}

export default Documents;
