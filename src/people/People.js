import React, { useState, useEffect } from "react";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Tabs from "../shell/Tabs.js";

import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";
import Modal from "../shell/Modal.js";

import PersonEditModal from "./PersonEditModal.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";

import { useParams, useNavigate } from "react-router-dom";

import { Loading } from "../Utils.js";

export default function People(props) {
  let navigate = useNavigate();

  let { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState();
  const [peopleMap, setPeopleMap] = useState();
  const [addModalShow, setAddModalShow] = useState();
  const [newPersonRef, setNewPersonRef] = useState();

  useEffect(() => {
    let unsubscribe = props.peopleRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newPeopleList = [];
        let newPeopleMap = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newPeopleList.push(data);
          newPeopleMap[data.ID] = data;
        });

        setPeopleList(newPeopleList);
        setPeopleMap(newPeopleMap);
      });
    return unsubscribe;
  }, []);

  if (!peopleList || !peopleMap) {
    return <Loading />;
  }

  if (personID && !(personID in peopleMap)) {
    navigate("/404");
  }

  let options = (person) => {
    let personRef = props.peopleRef.doc(person.ID);
    return (
      <Options>
        <Options.Item
          name="Edit"
          modal={<PersonEditModal personRef={personRef} />}
        />

        <Options.Item
          name="Delete"
          modal={
            <Modal
              name="Delete message"
              footer={[
                <Button
                  onClick={() => {
                    console.log(`Delete ${person.name} with ${person.ID}!`);
                    personRef.set(
                      {
                        deletedBy: props.user.email,
                        deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                      },
                      { merge: true }
                    );

                    navigate(`/orgs/${orgID}/people`);
                  }}
                >
                  Delete
                </Button>,
              ]}
            >
              <p>Do you want to delete {person.name}</p>
            </Modal>
          }
        />
      </Options>
    );
  };

  let peopleComponents = peopleList.map((person) => (
    <List.Item
      name={person.name}
      path={`/orgs/${orgID}/people/${person.ID}`}
      active={personID === person.ID}
      options={options(person)}
    />
  ));

  let content =
    personID && peopleMap[personID] ? (
      <Person person={peopleMap[personID]} />
    ) : (
      <></>
    );

  let modal = (
    <PersonEditModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      personRef={newPersonRef}
    />
  );

  return (
    <Page>
      <List>
        <List.Search placeholder="Search in documents..." />
        <List.Title>
          <List.Name>People</List.Name>
          <List.Add
            onClick={() => {
              props.peopleRef
                .add({
                  name: "Unnamed person",
                  createdBy: props.user.email,
                  creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                })
                .then((doc) => {
                  setNewPersonRef(doc);
                  setAddModalShow(true);
                  console.log("Should show modal");
                });
            }}
          />
          {modal}
        </List.Title>
        <List.Items>
          <Scrollable>{peopleComponents}</Scrollable>
        </List.Items>
      </List>
      <Content>{content}</Content>
    </Page>
  );
}

function Person(props) {
  let person = props.person;

  let fields = [
    { title: "Email", value: person.email },
    { title: "Company", value: person.company },
    { title: "Job", value: person.job },
    { title: "Phone", value: person.phone },
    { title: "Country", value: person.country },
    { title: "State", value: person.state },
    { title: "City", value: person.city },
  ];

  let contactFields = fields.flatMap((e) => {
    if (e.value === undefined) {
      return [];
    }

    return [
      <Row className="mb-3">
        <Col>
          <p style={{ margin: 0 }}>
            <small>{e.title}</small>
          </p>
          <p>
            <large>{e.value}</large>
          </p>
        </Col>
      </Row>,
    ];
  });

  if (person.customFields !== undefined) {
    Object.values(person.customFields).forEach((field) => {
      contactFields.push(
        <Row className="mb-3">
          <Col>
            <p style={{ margin: 0 }}>
              <small>{field.kind}</small>
            </p>
            <p>
              <large>{field.value}</large>
            </p>
          </Col>
        </Row>
      );
    });
  }

  if (person.labels !== undefined) {
    let labels = Object.values(person.labels).map((label) => {
      return (
        <Badge pill variant="secondary" style={{ marginRight: "0.5rem" }}>
          {label.name}
        </Badge>
      );
    });

    if (labels.length > 0) {
      contactFields.push(
        <Row className="mb-3">
          <Col>
            <p style={{ margin: 0 }}>
              <small>Labels</small>
            </p>
            <p>
              <large>{labels}</large>
            </p>
          </Col>
        </Row>
      );
    }
  }

  if (contactFields.length === 0) {
    contactFields.push(
      <p>
        A summary will be ready once you add data to this contact. Click here to
        get started.
      </p>
    );
  }

  return (
    <>
      <Content.Title>
        <Content.Name>{props.person.name}</Content.Name>
      </Content.Title>
      <Tabs>
        <Tabs.Pane name="Contact">
          <Tabs.Content>
            <Scrollable>{contactFields}</Scrollable>
          </Tabs.Content>
        </Tabs.Pane>
      </Tabs>
    </>
  );
}
