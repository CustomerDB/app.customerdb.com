import React from "react";

import Linkify from "react-linkify";

import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Tabs from "../shell/Tabs.js";

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
  let person = props.person;

  const showLabels = person.labels && Object.values(person.labels).length > 0;

  return (
    <Content>
      <Content.Title>
        <Content.Name>{props.person.name}</Content.Name>
        <Content.Options>{props.options(props.person.ID)}</Content.Options>
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
                  <p>
                    {Object.values(person.labels).map((label) => {
                      return <Label name={label.name} />;
                    })}
                  </p>
                </Field>
              )}
            </Scrollable>
          </Tabs.Content>
        </Tabs.Pane>
        <Tabs.Pane key="details" name="Details">
          <Tabs.Content></Tabs.Content>
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
