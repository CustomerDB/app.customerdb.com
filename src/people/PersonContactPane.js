import React, { useState, useEffect } from "react";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";

import Linkify from "react-linkify";

import PersonSidebar from "./PersonSidebar.js";

import Tabs from "../shell_obsolete/Tabs.js";
import Scrollable from "../shell_obsolete/Scrollable.js";

function Field(props) {
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

export default function PersonContactPane(props) {
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (!props.person) {
      return;
    }
    setShowLabels(
      props.person.labels && Object.values(props.person.labels).length > 0
    );
  }, [props.person]);

  return (
    <>
      <Tabs.Content>
        <Scrollable>
          {props.person.email && (
            <Field name="Email">
              {<Linkify>{props.person.email}</Linkify>}
            </Field>
          )}
          <Field name="Company">{props.person.company}</Field>
          <Field name="Job">{props.person.job}</Field>
          <Field name="Phone">{props.person.phone}</Field>
          <Field name="Country">{props.person.country}</Field>
          <Field name="State">{props.person.state}</Field>
          <Field name="City">{props.person.city}</Field>
          {props.person.customFields &&
            Object.values(props.person.customFields).map((field) => (
              <Field name={field.kind}>
                <Linkify>{field.value}</Linkify>
              </Field>
            ))}
          {showLabels && (
            <Field name="labels">
              {Object.values(props.person.labels).map((label) => {
                return <Label name={label.name} />;
              })}
            </Field>
          )}
        </Scrollable>
      </Tabs.Content>
      <PersonSidebar />
    </>
  );
}
