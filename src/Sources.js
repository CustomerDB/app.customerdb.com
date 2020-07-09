import React, { useState, useEffect } from 'react';

import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';

import 'react-virtualized/styles.css';
import { AutoSizer, List } from 'react-virtualized';

import Delta from 'quill-delta';

import Document from './Document.js';

import { useNavigate, useParams } from "react-router-dom";

import { ThreeDotsVertical } from 'react-bootstrap-icons';

function initialDelta() {
  return new Delta([{ insert: "" }]);
}

export default function Sources(props) {
  console.log("render documents");
  const [documentID, setDocumentID] = useState(undefined);
  const [documents, setDocuments] = useState([]);

  let { docID } = useParams();
  let navigate = useNavigate();

  useEffect(() => {
    console.log('useEffect', props);
    let unsubscribe = props.documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
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


  // Modals
  const [editID, setEditID] = useState(undefined);
  const [editValue, setEditValue] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const [deleteID, setDeleteID] = useState(undefined);
  const [deleteTitle, setDeleteTitle] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const cardRenderer = ({ key, index, style }) => {
    let d = documents[index];

    const linkToDocument = () => {
      navigate(`/orgs/${props.orgID}/sources/${d.ID}`);
    };

    let title = <p className="listCardTitle" onClick={linkToDocument}>{d.title}</p>;

    let listCardClass = "listCard";
    let threedots = <ThreeDotsVertical />;

    if (documentID === d.ID) {
      listCardClass = "listCardActive";
      threedots = <ThreeDotsVertical color="white" />;
    }

    return <Row key={d.ID} style={style}>
      <Col>
        <Container className={listCardClass}>
          <Row>
            <Col className="listTitleContainer align-self-center" md={8}>
              {title}
            </Col>
            <Col md={4}>
              <Dropdown style={{ width: "2.5rem", marginLeft: "auto" }}>
                <Dropdown.Toggle variant="link" className="threedots">
                  {threedots}
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => {
                    setEditID(d.ID);
                    setEditValue(d.title);
                    setShowEditModal(true);
                  }}>Rename</Dropdown.Item>
                  <Dropdown.Item onClick={() => {
                    setDeleteID(d.ID);
                    setDeleteTitle(d.title);
                    setShowDeleteModal(true);
                  }}>Delete</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
          <Row>
            <Col>
              <p onClick={linkToDocument}></p>
            </Col>
          </Row>
        </Container>
      </Col>
    </Row>;
  };

  const editSubmit = () => {
    renameDocument(editID, editValue);
    setEditID(undefined);
    setEditValue("");
    setShowEditModal(false);
  }

  return <Container className="noMargin">
    <Row className="h-100">
      <Col md={4} className="d-flex flex-column h-100">
        <Row style={{ paddingBottom: "2rem" }}>
          <Col md={10} className="my-auto">
            <h3 style={{ margin: 0 }}>Documents</h3>
          </Col>
          <Col md={2}>
            <Button className="addButton" onClick={createNewDocument}>+</Button>
          </Col>
        </Row>
        <Row className="flex-grow-1">
          <Col>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  rowCount={documents.length}
                  rowHeight={window.getEmPixels() * 6}
                  rowRenderer={cardRenderer}
                  width={width}
                />
              )}
            </AutoSizer>
          </Col>
        </Row>

        <Modal show={showEditModal} onHide={() => { setShowEditModal(false) }} centered>
          <Modal.Header closeButton>
            <Modal.Title>Rename source</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Control type="text" defaultValue={editValue} onChange={(e) => {
              setEditValue(e.target.value);
            }} onKeyDown={(e) => {
              if (e.key === 'Enter') {
                editSubmit();
              }
            }} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={editSubmit}>
              Rename
              </Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showDeleteModal} onHide={() => { setShowDeleteModal(false) }} centered>
          <Modal.Header closeButton>
            <Modal.Title>Delete source</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete {deleteTitle}?
            </Modal.Body>
          <Modal.Footer>
            <Button variant="danger" onClick={() => {
              deleteDocument(deleteID);
              setDeleteID(undefined);
              setDeleteTitle("");
              setShowDeleteModal(false);
            }}>
              Delete
              </Button>
          </Modal.Footer>
        </Modal>
      </Col>
      <Col md={8}>
        {view}
      </Col>
    </Row>
  </Container>;
}