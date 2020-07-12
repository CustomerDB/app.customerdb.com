import React, { useState, useEffect } from 'react';

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';


import List from './List.js';
import Person from './Person.js';

import { useNavigate, useParams } from "react-router-dom";

export default function People(props) {
  const [personID, setPersonID] = useState(undefined);
  const [people, setPeople] = useState([]);

  let { perID } = useParams();
  let navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = props.peopleRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newPeople = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data['ID'] = doc.id;
          data['title'] = data['name'];
          data['description'] = "";
          newPeople.push(data);
        });

        setPeople(newPeople);
      });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setPersonID(perID);
  }, [perID]);

  const onAdd = () => {
    props.peopleRef.add({
      name: "New contact",
      createdBy: props.user.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: ""
    });
  };

  const onClick = (ID) => {
    navigate(`/orgs/${props.orgID}/people/${ID}`);
  };

  const itemLoad = (index) => {
    return people[index];
  }

  const onRename = (ID, newName) => {
    props.peopleRef.doc(ID).set({
      name: newName
    }, { merge: true });
  };

  const onDelete = (ID) => {
    props.peopleRef.doc(ID).update({
      deletedBy: props.user.email,
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    if (personID === ID) {
      navigate("..");
    }
  };

  // Modals for options (three vertical dots) for list and for person view.
  const [modalPerson, setModalPerson] = useState(undefined);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  let options = [
    {name: "Rename", onClick: (item) => {
      setModalPerson(item);
      setShowRenameModal(true);
    }},
    {name: "Delete", onClick: (item) => {
      setModalPerson(item);
      setShowDeleteModal(true);
    }}
  ]

  let view;
  if (personID !== undefined) {
    view = <Person key={personID} personID={personID} peopleRef={props.peopleRef} user={props.user} options={options}/>;
  }

  return <><Container className="noMargin">
    <Row className="h-100">
      <Col md={4} className="d-flex flex-column h-100">
        <List
          title="People"
          itemType="contact"
          currentID={personID}

          itemLoad={itemLoad}
          itemCount={people.length}

          onAdd={onAdd}
          options={options}
          onClick={onClick}
        />
      </Col>
      <Col md={8}>
        {view}
      </Col>
    </Row>
  </Container>
  <RenameModal show={showRenameModal} person={modalPerson} onRename={onRename} onHide={() => {setShowRenameModal(false)}}/>
  <DeleteModal show={showDeleteModal} person={modalPerson} onDelete={onDelete} onHide={() => {setShowDeleteModal(false)}}/>
  </>;
}

function RenameModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.person !== undefined) {
      setName(props.person.name);
    }
  }, [props.person]);

  const onSubmit = () => {
      props.onRename(props.person.ID, name);
      props.onHide();
  }

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Rename contact</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form.Control type="text" defaultValue={name} onChange={(e) => {
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
    if (props.person !== undefined) {
      setName(props.person.name);
    }
  }, [props.person]);

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Delete contact</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to delete {name}?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={() => {
        props.onDelete(props.person.ID);
        props.onHide();
      }}>
        Delete
      </Button>
    </Modal.Footer>
  </Modal>;
}