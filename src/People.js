import React, { useState, useEffect } from 'react';

import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import { v4 as uuidv4 } from 'uuid';

import { XCircleFill } from 'react-bootstrap-icons';


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
          data['title'] = data.name;
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

  const onEdit = (item) => {
    let {ID, title, ...rest} = item;
    props.peopleRef.doc(item.ID).set(rest);
  }

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  let options = [
    {name: "Edit", onClick: (item) => {
      setModalPerson(item);
      setShowEditModal(true);
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
      <Col md={8} className="d-flex flex-column h-100">
        {view}
      </Col>
    </Row>
  </Container>
  <EditModal show={showEditModal} person={modalPerson} onEdit={onEdit} onHide={() => {setShowEditModal(false)}}/>
  <DeleteModal show={showDeleteModal} person={modalPerson} onDelete={onDelete} onHide={() => {setShowDeleteModal(false)}}/>
  </>;
}

function EditModal(props) {
  const [expanded, setExpanded] = useState(false);

  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [company, setCompany] = useState();
  const [job, setJob] = useState();
  const [phone, setPhone] = useState();
  const [country, setCountry] = useState();
  const [state, setState] = useState();
  const [city, setCity] = useState();

  const [customFields, setCustomFields] = useState({});
  const [labels, setLabels] = useState([]);

  let person = props.person;

  const addCustomField = () => {
    let ID = uuidv4(); 
    let fields = {};
    Object.assign(fields, customFields);
    fields[ID] = {ID: ID, kind: "", value: ""};
    setCustomFields(fields);
  };

  const addLabel = () => {
    let ID = uuidv4(); 
    let l = {};
    Object.assign(l, labels);
    l[ID] = {ID: ID, kind: ""};
    setLabels(l);
  };

  useEffect(() => {
    if (props.person !== undefined && props.person.customFields !== undefined) {
      setCustomFields(props.person.customFields);
    }
  }, [props.person]);

  useEffect(() => {
    if (props.person !== undefined && props.person.labels !== undefined) {
      setLabels(props.person.labels);
    }
  }, [props.person]);

  if (props.person === undefined) {
    return <></>;
  }

  const onSubmit = () => {
    if (name !== undefined) {
      person.name = name;
    }

    if (email !== undefined) {
      person.email = email;
    }

    if (company !== undefined) {
      person.company = company;
    }

    if (job !== undefined) {
      person.job = job;
    }

    if (phone !== undefined) {
      person.phone = phone;
    }

    if (country !== undefined) {
      person.country = country;
    }

    if (state !== undefined) {
      person.state = state;
    }

    if (city !== undefined) {
      person.city = city;
    }

    person.customFields = customFields;
    person.labels = labels;

    props.onEdit(person);
    props.onHide();
  }

  let expandedControls = <>
    <Row className="mb-3">
      <Col>
        <Form.Label>Phone number</Form.Label>
        <Form.Control type="text" placeholder="Phone" defaultValue={props.person.phone} onChange={(e) => {setPhone(e.target.value)}}/>
      </Col>
    </Row>
    <Row>
      <Col>
        <Form.Label>Location</Form.Label>
      </Col>
    </Row>
    <Row className="mb-3">
      <Col>
        <Form.Control type="text" placeholder="Country" defaultValue={props.person.country} onChange={(e) => {setCountry(e.target.value)}}/>
      </Col>
      <Col>
        <Form.Control type="text" placeholder="State" defaultValue={props.person.state} onChange={(e) => {setState(e.target.value)}}/>
      </Col>
      <Col>
        <Form.Control type="text" placeholder="City" defaultValue={props.person.city} onChange={(e) => {setCity(e.target.value)}}/>
      </Col>
    </Row>
    <Row>
      <Col>
        <Form.Label>Other details</Form.Label>
      </Col>
    </Row>
    {Object.values(customFields).map(field => {
    return <Row className="mb-2" key={field.ID}>
      <Col>
        <Row>
          <Col md={4}><Form.Control type="text" placeholder="Kind" defaultValue={field.kind} onChange={
            (e) => {
              let fields = {};
              Object.assign(fields, customFields);
              fields[field.ID].kind = e.target.value;
              setCustomFields(fields);
            }
          }/></Col>
          <Col md={7}><Form.Control type="text" placeholder="Value" defaultValue={field.value} onChange={
            (e) => {
              let fields = {};
              Object.assign(fields, customFields);
              fields[field.ID].value = e.target.value;
              setCustomFields(fields);
            }
          }/></Col>
          <Col md={1} style={{padding: 0}}>
            <Button variant="link"> 
              <XCircleFill color="grey" onClick={() => {
                let fields = {};
                Object.assign(fields, customFields);
                delete fields[field.ID];
                setCustomFields(fields);
              }}/>
            </Button>
          </Col>
        </Row>
      </Col>
    </Row>})}
    <Row className="mb-3">
      <Col>
        <Button className="addButton" style={{width: "1.5rem", height: "1.5rem", fontSize: "0.75rem"}} onClick={addCustomField}>+</Button>
      </Col>
    </Row>
    <Row>
      <Col>
        <Form.Label>Labels</Form.Label>
      </Col>
    </Row>
    {Object.values(labels).map(label => {
    return <Row className="mb-2" key={label.ID}>
      <Col>
        <Row>
          <Col md={8}><Form.Control type="text" placeholder="Name" defaultValue={label.name} onChange={
            (e) => {
              let l = {};
              Object.assign(l, labels);
              l[label.ID].name = e.target.value;
              setLabels(l);
            }
          }/></Col>
          <Col md={1} style={{padding: 0}}>
            <Button variant="link"> 
              <XCircleFill color="grey" onClick={() => {
                let l = {};
                Object.assign(l, labels);
                delete l[label.ID];
                setLabels(l);
              }}/>
            </Button>
          </Col>
        </Row>
      </Col>
    </Row>})}
    <Row>
      <Col>
        <Button className="addButton" style={{width: "1.5rem", height: "1.5rem", fontSize: "0.75rem"}} onClick={addLabel}>+</Button>
      </Col>
    </Row>
  </>;

  return <Modal show={props.show} onHide={props.onHide} centered>
    <Modal.Header closeButton>
      <Modal.Title>Edit person</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Container>
      <Row className="mb-3">
        <Col>
          <Form.Label>Full name</Form.Label>
          <Form.Control type="text" placeholder="Name" defaultValue={props.person.name} onChange={(e) => {setName(e.target.value)}}/>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col>
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Email" defaultValue={props.person.email} onChange={(e) => {setEmail(e.target.value)}}/>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col>
          <Form.Label>Company name</Form.Label>
          <Form.Control type="text" placeholder="Company" defaultValue={props.person.company} onChange={(e) => {setCompany(e.target.value)}}/>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col>
          <Form.Label>Job title</Form.Label>
          <Form.Control type="text" placeholder="Job" defaultValue={props.person.job} onChange={(e) => {setJob(e.target.value)}}/>
        </Col>
      </Row>
      {expanded ? expandedControls : <></>}
      </Container>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="link" onClick={() => {setExpanded(!expanded)}}>
        {expanded ? "Less" : "More"}
      </Button>
      <Button variant="primary" onClick={onSubmit}>
        Save
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
      <Modal.Title>Delete person</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to delete {name}?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={() => {
        props.onDelete(props.person.ID);
        props.onHide();
      }}>Delete</Button>
    </Modal.Footer>
  </Modal>;
}