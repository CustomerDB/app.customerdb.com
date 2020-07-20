import React, { useState, useEffect } from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

import { Navigate, useNavigate, useParams } from "react-router-dom";

import { AutoSizer } from "react-virtualized";

import Options from "./Options.js";

export default function Person(props) {
  const [person, setPerson] = useState(undefined);

  let { orgID, personID, tabID } = useParams();

  let navigate = useNavigate();

  useEffect(() => {
    let unsubscribe = props.peopleRef.doc(props.personID).onSnapshot((doc) => {
      let data = doc.data();
      data["ID"] = doc.id;
      setPerson(data);
    });
    return unsubscribe;
  }, [props.personID]);

  if (person === undefined) {
    return <></>;
  }

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

  let tabPanes = {
    contact: (
      <Tab.Pane eventKey="contact">
        <Container>{contactFields}</Container>
      </Tab.Pane>
    ),
    activity: (
      <Tab.Pane eventKey="activity">
        <p>None</p>
      </Tab.Pane>
    ),
  };

  if (tabID && !(tabID in tabPanes)) {
    return <Navigate to="/404" />;
  }

  let activeTab = tabID || "contact";

  const onTabClick = (key) => {
    navigate(`/orgs/${orgID}/people/${personID}/${key}`);
  };

  return (
    <>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col className="d-flex align-self-center">
          <h3 className="my-auto">{person.name}</h3>
          <Button variant="link">
            <Options item={person} options={props.options} />
          </Button>
        </Col>
      </Row>
      <Tab.Container
        id="personTabs"
        activeKey={activeTab}
        onSelect={onTabClick}
      >
        <Row>
          <Col>
            <Nav variant="pills">
              <Nav.Item>
                <Nav.Link eventKey="contact">Contact</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="activity">Activity</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>
        <Row className="flex-grow-1">
          <AutoSizer>
            {({ height, width }) => (
              <Col>
                <Tab.Content
                  className="p-3"
                  style={{ height: height, width: width, overflowY: "auto" }}
                >
                  {Object.values(tabPanes)}
                </Tab.Content>
              </Col>
            )}
          </AutoSizer>
        </Row>
      </Tab.Container>
    </>
  );
}
