import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import List from './List.js';

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
  const onEdit = () => {};
  const onDelete = () => {};
  const onClick = () => {};

  const itemLoad = (index) => {
    return people[index];
  }

  let view;

  return <Container className="noMargin">
  <Row className="h-100">
    <Col md={4} className="d-flex flex-column h-100">
      <List
        title="People"
        itemType="contact"
        currentID={personID}

        itemLoad={itemLoad}
        itemCount={people.length}

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
