import React, { useState, useEffect } from 'react';

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';

import Dataset from './Dataset.js';
import List from './List.js';

import { useNavigate, useParams } from "react-router-dom";

export default function Explore(props) {
  const [datasets, setDatasets] = useState(undefined);
  const [datasetRef, setDatasetRef] = useState(undefined);
  const [dataset, setDataset] = useState(undefined);

  let { datasetID } = useParams();
  let navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = props.datasetsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newDatasets = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data['ID'] = doc.id;
          newDatasets.push(data);
        });

        setDatasets(newDatasets);

        console.log('setDatasets', newDatasets);
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!datasetID || datasetID === "" || !datasets) {
      setDataset(undefined);
      setDatasetRef(undefined);
      return;
    }

    let newDataset = datasets.find(ds => ds.ID === datasetID);
    if (newDataset === undefined) {
      navigate('/404');
      return;
    }

    setDataset(newDataset);
    setDatasetRef(props.datasetsRef.doc(newDataset.ID));
  }, [datasetID, datasets]);

  const onAdd = () => {
    props.datasetsRef.add({
      name: "New dataset",
      createdBy: props.user.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      documentIDs: [],

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: ""
    });
  };

  const onClick = (ID) => {
    navigate(`/orgs/${props.orgID}/explore/${ID}`);
  };

  const itemLoad = (index) => {
    return datasets[index];
  }

  const onRename = (ID, newName) => {
    props.datasetsRef.doc(ID).set({
      name: newName
    }, { merge: true });
  };

  const onDelete = (ID) => {
    props.datasetsRef.doc(ID).update({
      deletedBy: props.user.email,
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    if (datasetID === ID) {
      navigate("..");
    }
  };

  // Modals for options (three vertical dots) for list and for dataset view.
  const [modalDataset, setModalDataset] = useState(undefined);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  let options = [
    {name: "Rename", onClick: (item) => {
      setModalDataset(item);
      setShowRenameModal(true);
    }},

    {name: "Delete", onClick: (item) => {
      setModalDataset(item);
      setShowDeleteModal(true);
    }}
  ]

  if (datasets === undefined) {
    // TODO: Could be made a loader in the list instead.
    return <></>;
  }

  let view;
  if (dataset !== undefined) {
    view = <Dataset
      user={props.user}
      orgID={props.orgID}
      documentsRef={props.documentsRef}
      dataset={dataset}
      allHighlightsRef={props.allHighlightsRef}
      datasetRef={datasetRef}
      options={options} />;
  }

  return <><Container className="noMargin">
    <Row className="h-100">
      <Col md={4} className="d-flex flex-column h-100">
        <List
          name="Customer Datasets"
          currentID={datasetID}

          itemLoad={itemLoad}
          itemCount={datasets.length}

          onAdd={onAdd}
          options={options}
          onClick={onClick}
        />
      </Col>
      <Col md={8} className="d-flex flex-column h-100">
        {view}
      </Col>
    </Row>
  </Container>

  <RenameModal show={showRenameModal} dataset={modalDataset} onRename={onRename} onHide={() => {setShowRenameModal(false)}}/>
  <DeleteModal show={showDeleteModal} dataset={modalDataset} onDelete={onDelete} onHide={() => {setShowDeleteModal(false)}}/>
  </>;
}

function RenameModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.dataset !== undefined) {
      setName(props.dataset.name);
    }
  }, [props.dataset]);

  const onSubmit = () => {
      props.onRename(props.dataset.ID, name);
      props.onHide();
  }

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Rename dataset</Modal.Title>
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
    if (props.dataset !== undefined) {
      setName(props.dataset.name);
    }
  }, [props.dataset]);

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Delete dataset</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to delete {name}?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={() => {
        props.onDelete(props.dataset.ID);
        props.onHide();
      }}>Delete</Button>
    </Modal.Footer>
  </Modal>;
}
