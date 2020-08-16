import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import Moment from "react-moment";

export default function DocumentDeleted(props) {

  let relativeTime = undefined;
  if (props.document.deletionTimestamp) {
    relativeTime = <Moment fromNow date={props.document.deletionTimestamp.toDate()} />
  }

  return (
    <Container>
      <Row noGutters={true}>
        <Col>
          <h3>{props.document.name}</h3>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col>
          <p>
            This document was deleted {relativeTime} by{" "}
            {props.document.deletedBy}
          </p>
        </Col>
      </Row>
    </Container>
  );
}
