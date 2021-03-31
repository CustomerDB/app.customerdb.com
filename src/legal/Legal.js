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

import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import { Link } from "react-router-dom";
import React from "react";
import Row from "react-bootstrap/Row";
import logo from "../assets/images/logo.svg";

function loadTermly() {
  (function (d, s, id) {
    var js,
      tjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://app.termly.io/embed-policy.min.js";
    tjs.parentNode.insertBefore(js, tjs);
  })(document, "script", "termly-jssdk");
}

export function Terms() {
  return <Legal termlyId="802aaa82-725e-4a5e-b8a2-d6cd96a3b9ea" />;
}

export function Privacy() {
  return <Legal termlyId="fb85b547-fa2d-42a7-b39a-3b06ab7f84ce" />;
}

export function Cookies() {
  return (
    <Legal
      termlyId="ecb8e6d6-52d7-480a-b8b0-faf537fc607d"
      header={
        <Button
          onClick={() => {
            window.displayPreferenceModal();
          }}
        >
          Manage Cookie Preferences
        </Button>
      }
    />
  );
}

function Legal(props) {
  loadTermly();

  return (
    <Container>
      <Row>
        <Col md={10}>
          <Link to="/">
            <img
              className="m-4"
              style={{ width: "25%" }}
              src={logo}
              alt="CustomerDB logo"
            />
          </Link>

          <div>{props.header}</div>

          <div
            name="termly-embed"
            data-id={props.termlyId}
            data-type="iframe"
          />

          <p>
            This site is protected by reCAPTCHA and the Google{" "}
            <a href="https://policies.google.com/privacy">Privacy Policy</a>
            &nbsp;and{" "}
            <a href="https://policies.google.com/terms">
              Terms of Service
            </a>{" "}
            apply.
          </p>
        </Col>
        <Col md={2} className="p-4">
          <h4>Have a question?</h4>
          <p class="font-size-sm text-gray-800 mb-5">
            We’d be happy to chat with you and clear things up. Anytime!
          </p>
          <h6 class="font-weight-bold text-uppercase text-gray-700 mb-2">
            Call anytime
          </h6>
          <p class="font-size-sm mb-5">
            <a href="tel:786-453-6527" class="text-reset">
              (786) 453-6527
            </a>
          </p>
          <h6 class="font-weight-bold text-uppercase text-gray-700 mb-2">
            Email us
          </h6>
          <p class="font-size-sm mb-0">
            <a href="mailto:hello@quantap.com" class="text-reset">
              hello@quantap.com
            </a>
          </p>
        </Col>
      </Row>
    </Container>
  );
}
