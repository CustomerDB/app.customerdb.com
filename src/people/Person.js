import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import useFirestore from "../db/Firestore.js";

import PersonSidebar from "./PersonSidebar.js";

import { Loading } from "../util/Utils.js";
import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Tabs from "../shell/Tabs.js";

import Linkify from "react-linkify";

function Field(props) {
  console.log("Field props", props);

  if (props.children == null) {
    return <></>;
  }

  return (
    <Row key={props.name} className="mb-3" noGutters={true}>
      <Col>
        <p style={{ margin: 0 }}>
          <small>{props.name}</small>
        </p>
        <p>{props.children}</p>
      </Col>
    </Row>
  );
}

function Label(props) {
  return (
    <Badge
      key={props.name}
      pill
      variant="secondary"
      style={{ marginRight: "0.5rem" }}
    >
      {props.name}
    </Badge>
  );
}

export default function Person(props) {
  const { personID } = useParams();
  const { personRef } = useFirestore();
  const [person, setPerson] = useState();
  const [showLabels, setShowLabels] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!personRef) {
      return;
    }
    return personRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }
      setPerson(doc.data());
    });
  }, [personRef, navigate]);

  useEffect(() => {
    if (!person) {
      return;
    }
    setShowLabels(person.labels && Object.values(person.labels).length > 0);
  }, [person]);

  if (!person) {
    return <Loading />;
  }

  return (
    <Content>
      <Content.Title>
        <Content.Name>{person.name}</Content.Name>
        <Content.Options>{props.options(personID)}</Content.Options>
      </Content.Title>
      <Tabs default="Contact">
        <Tabs.Pane key="contact" name="Contact">
          <Tabs.Content>
            <Scrollable>
              {person.email && (
                <Field name="Email">{<Linkify>{person.email}</Linkify>}</Field>
              )}
              <Field name="Company">{person.company}</Field>
              <Field name="Job">{person.job}</Field>
              <Field name="Phone">{person.phone}</Field>
              <Field name="Country">{person.country}</Field>
              <Field name="State">{person.state}</Field>
              <Field name="City">{person.city}</Field>
              {person.customFields &&
                Object.values(person.customFields).map((field) => (
                  <Field name={field.kind}>
                    <Linkify>{field.value}</Linkify>
                  </Field>
                ))}
              {showLabels && (
                <Field name="labels">
                  {Object.values(person.labels).map((label) => {
                    return <Label name={label.name} />;
                  })}
                </Field>
              )}
            </Scrollable>
          </Tabs.Content>
          <PersonSidebar />
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
