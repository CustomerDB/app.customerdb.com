import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import illustration from "./assets/images/404.svg";

export default function Error404(props) {
  return (
    <Container style={{ marginTop: "3rem" }}>
      <Row>
        <Col>
          <Container>
            <h1>Whoops! This was not supposed to happen.</h1>
            <h3>
              Click <a href="/">here</a> to get back to safety
            </h3>
          </Container>
        </Col>
      </Row>

      <Row>
        <Col>
          <Container>
            <img
              src={illustration}
              alt="404 illustration"
              style={{ width: "50%" }}
            />
          </Container>
        </Col>
      </Row>
    </Container>
  );
}
