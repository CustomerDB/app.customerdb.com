import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import React from "react";
import Row from "react-bootstrap/Row";
import illustration from "./assets/images/404.svg";

export default function Error404(props) {
  return (
    <Container style={{ marginTop: "3rem" }}>
      <Row>
        <Col>
          <Container>
            <h1>Whoops! This was not supposed to happen.</h1>
            <h3>
              <a href="/">Get back to safety</a>
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
