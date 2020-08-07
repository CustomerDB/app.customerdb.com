import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import StackdriverErrorReporter from "stackdriver-errors-js";

import illustration from "../assets/images/crash.svg";

const project_id = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const api_key = process.env.REACT_APP_ERROR_API_KEY;
const version = process.env.REACT_APP_VERSION;

export const errorHandler = new StackdriverErrorReporter();
errorHandler.start({
  key: api_key,
  projectId: project_id,
  version: version,
});

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    errorHandler.report(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
                  alt="Crash illustration"
                  style={{ width: "50%" }}
                />
              </Container>
            </Col>
          </Row>
        </Container>
      );
    }

    return this.props.children;
  }
}
