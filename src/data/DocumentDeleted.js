import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function DocumentDeleted(props) {
  let date = this.state.document.deletionTimestamp.toDate();

  return (
    <Container>
      <Row noGutters={true}>
        <Col>
          <h3>{this.state.document.name}</h3>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col>
          <p>
            This document was deleted at {date.toString()} by{" "}
            {this.state.document.deletedBy}
          </p>
        </Col>
      </Row>
    </Container>
  );
}
