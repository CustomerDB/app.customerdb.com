// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import React from "react";
import Row from "react-bootstrap/Row";
import StackdriverErrorReporter from "stackdriver-errors-js";
import illustration from "../assets/images/crash.svg";

const project_id = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const api_key = process.env.REACT_APP_ERROR_API_KEY;
const version = process.env.REACT_APP_VERSION;

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };

    if (api_key) {
      this.errorHandler = new StackdriverErrorReporter();

      this.errorHandler.start({
        key: api_key,
        projectId: project_id,
        version: version,
      });
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.debug("Error Boundary", error, errorInfo);
    if (this.errorHandler) {
      this.errorHandler.report(error, errorInfo);
    }
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
