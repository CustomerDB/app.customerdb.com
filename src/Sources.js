import React, { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Delta from 'quill-delta';

import Document from './Document.js';

import { useNavigate, useParams } from "react-router-dom";

import { ThreeDotsVertical } from 'react-bootstrap-icons';

function initialDelta() {
  return new Delta([{ insert: "" }]);
}

export default function Sources(props) {
  console.log("render documents");
  const [ documentID, setDocumentID ] = useState(undefined);

  let { docID } = useParams();
  let navigate = useNavigate();

  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    console.log('useEffect', props);
    let unsubscribe = props.documentsRef
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        console.log("documents snapshot received");

        let newDocuments = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data['ID'] = doc.id;
          newDocuments.push(data);
        });

        setDocuments(newDocuments);
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setDocumentID(docID);
  }, [docID]);

  const createNewDocument = () => {
    console.log("createNewDocument", props.user);
    props.documentsRef.add({
      title: "Untitled Document",
      createdBy: props.user.email,
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
          userEmail: props.user.email,
          ops: delta.ops,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        });
    });
  };

  const renameDocument = (id, newTitle) => {
    console.log("renameDocument");
    props.documentsRef.doc(id).set({
      title: newTitle
    }, { merge: true });
  };

  const deleteDocument = (id) => {
    console.log("deleteDocument");
    // TODO(CD): Add periodic job to garbage-collect documents after some
    //           reasonable grace period.
    //
    // TODO(CD): Add some way to recover deleted documents that are still
    //           within the grace period.
    props.documentsRef.doc(id).update({
      deletedBy: props.user.email,
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    // Remove focus from document selected.
    if (documentID === id) {
      navigate("..");
    }
  };

  console.log("documentID", documentID);

  let view = <></>;
  if (documentID !== undefined) {
    view = <Document key={documentID} documentID={documentID} documentsRef={props.documentsRef} user={props.user} />;
  }

  let documentList = <DocumentList
    documentID={documentID}
    documents={documents}
    deleteDocument={deleteDocument}
    renameDocument={renameDocument}
    orgID={props.orgID} />;

  return <Container className="noMargin">
    <Row>
      <Col md={4}>
        <Row mb={10}>
          <Col md={10}>
            <h3>Documents</h3>
          </Col>
          <Col md={2}>
            <Button className="addButton" onClick={createNewDocument}>+</Button>
          </Col>
        </Row>
        {documentList}
      </Col>
      <Col md={8}>
        {view}
      </Col>
    </Row>
  </Container>;
}

function DocumentList(props) {
  console.log("DocumentList", props);
  let navigate = useNavigate();

  const [edit, setEdit] = useState(undefined);
  const [editValue, setEditValue] = useState("");

  let documentRows = props.documents.map((d) => {
    let title = <p onClick={() => {
      navigate(`/orgs/${props.orgID}/sources/${documentID}`);
    }} className="listCardTitle">{d.title}</p>;
    if (edit === d.ID) {
      d.ref = React.createRef();
      title = <input type="text" onBlur={(e) => {
        props.renameDocument(d.ID, editValue);
        setEdit(undefined);
        setEditValue("");
      }} onChange={(e) => {
        setEditValue(e.target.value);
      }}
        defaultValue={d.title} />;
    }

    let documentID = d.ID;
    let listCardClass = "listCard";
    let threedots = <ThreeDotsVertical />;

    if (props.documentID === documentID) {
      listCardClass = "listCardActive";
      threedots = <ThreeDotsVertical color="white" />;
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
                  <Dropdown.Item onClick={() => { props.deleteDocument(documentID) }}>Delete</Dropdown.Item>
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
