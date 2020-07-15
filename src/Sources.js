import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

import { FileEarmarkText } from 'react-bootstrap-icons';


import Delta from 'quill-delta';

import List from './List.js';
import Document from './Document.js';

import { useNavigate, useParams, Link } from "react-router-dom";

function initialDelta() {
  return new Delta([{ insert: "" }]);
}

export default function Sources(props) {
  const [documentID, setDocumentID] = useState(undefined);
  const [documents, setDocuments] = useState([]);

  let { docID } = useParams();
  let navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = props.documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.log("documents snapshot received");

        let newDocuments = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data['ID'] = doc.id;
          data['icon'] = <FileEarmarkText size={24}/>
          newDocuments.push(data);
        });

        setDocuments(newDocuments);
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setDocumentID(docID);
  }, [docID]);

  const onAdd = () => {
    props.documentsRef.add({
      name: "Untitled Document",
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

  const onDelete = (ID) => {
    // TODO(CD): Add periodic job to garbage-collect documents after some
    //           reasonable grace period.
    //
    // TODO(CD): Add some way to recover deleted documents that are still
    //           within the grace period.
    props.documentsRef.doc(ID).update({
      deletedBy: props.user.email,
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    // Remove focus from document selected.
    if (documentID === ID) {
      navigate("..");
    }
  };

  const onClick = (ID) => {
    navigate(`/orgs/${props.orgID}/data/${ID}`);
  };

  const onRename = (ID, newName) => {
    props.documentsRef.doc(ID).set({
      name: newName
    }, { merge: true });
  };

  const itemLoad = (index) => {
    return documents[index];
  };

  // Modals for options (three vertical dots) for list and for document view.
  const [modalDocument, setModalDocument] = useState(undefined);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  let options = [
    {name: "Rename", onClick: (item) => {
      setModalDocument(item);
      setShowRenameModal(true);
    }},
    {name: "Delete", onClick: (item) => {
      setModalDocument(item);
      setShowDeleteModal(true);
    }}
  ];

  let view;
  if (documentID !== undefined) {
    view = <Document key={documentID} documentID={documentID} documentsRef={props.documentsRef} tagGroupsRef={props.tagGroupsRef} user={props.user} />;
  }

  return <><Container className="noMargin">
    <Row className="h-100">
      <Col md={4} className="d-flex flex-column h-100">
        <List
          name="Customer Data"
          currentID={documentID}

          itemLoad={itemLoad}
          itemCount={documents.length}

          onAdd={onAdd}
          options={options}
          onClick={onClick}

          optionsRow={<Row>
            <Col><Link to={`/orgs/${props.orgID}/data/tags`}>Manage tags</Link></Col>
          </Row>}
        />
      </Col>
      <Col md={8} className="d-flex flex-column h-100">
        {view}
      </Col>
    </Row>
  </Container>
  <RenameModal show={showRenameModal} document={modalDocument} onRename={onRename} onHide={() => {setShowRenameModal(false)}}/>
  <DeleteModal show={showDeleteModal} document={modalDocument} onDelete={onDelete} onHide={() => {setShowDeleteModal(false)}}/>
  </>;
}

function RenameModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.document !== undefined) {
      setName(props.document.name);
    }
  }, [props.document]);

  const onSubmit = () => {
      props.onRename(props.document.ID, name);
      props.onHide();
  }

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Rename document</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form.Control type="text" value={name} onChange={(e) => {
        setName(e.target.value);
      }} onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onSubmit();
        }
      }} />
    </Modal.Body>
    <Modal.Footer>
      <Button variant="primary" onClick={onSubmit}>
        Rename
      </Button>
    </Modal.Footer>
  </Modal>;
}

function DeleteModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.document !== undefined) {
      setName(props.document.name);
    }
  }, [props.document]);

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Delete document</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to delete {name}?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={() => {
        props.onDelete(props.document.ID);
        props.onHide();
      }}>
        Delete
      </Button>
    </Modal.Footer>
  </Modal>;
}
