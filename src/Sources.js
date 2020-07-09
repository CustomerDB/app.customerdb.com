import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import Delta from 'quill-delta';

import List from './List.js';
import Document from './Document.js';

import { useNavigate, useParams } from "react-router-dom";

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
          data['description'] = "";
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

  const onDelete = (id) => {
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

  const onClick = (ID) => {
    navigate(`/orgs/${props.orgID}/sources/${ID}`);
  };

  const onEdit = (ID, value) => {
    console.log("renameDocument");
    props.documentsRef.doc(ID).set({
      title: value
    }, { merge: true });
  };

  const itemLoad = (index) => {
    return documents[index];
  };

  let view;
  if (documentID !== undefined) {
    view = <Document key={documentID} documentID={documentID} documentsRef={props.documentsRef} user={props.user} />;
  }

  return <Container className="noMargin">
    <Row className="h-100">
      <Col md={4} className="d-flex flex-column h-100">
        <List
          title="Sources"
          itemType="source"
          currentID={documentID}

          itemLoad={itemLoad}
          itemCount={documents.length}

          onAdd={onAdd}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onClick}
        />
      </Col>
      <Col md={8}>
        {view}
      </Col>
    </Row>
  </Container>;
}