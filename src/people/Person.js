import React, { useState, useEffect } from "react";

import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Tabs from "../shell/Tabs.js";
import Options from "../Options.js";

export default function Person(props) {
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
      <Row className="mb-3" noGutters={true}>
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
        <Row className="mb-3" noGutters={true}>
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
        <Row className="mb-3" noGutters={true}>
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
        <Content.Options>{props.options(props.person)}</Content.Options>
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
