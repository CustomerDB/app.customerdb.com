import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

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
  return <Legal termlyId="dcaba0e8-1fd7-4fda-a336-6532d9ab0243" />;
}

export function Privacy() {
  return <Legal termlyId="2ef6b54e-09e3-4956-a8f8-cf0fd2880e4d" />;
}

export function Cookies() {
  return (
    <Legal
      termlyId="ecb8e6d6-52d7-480a-b8b0-faf537fc607d"
      header={
        <Button onClick={window.displayPreferenceModal()}>
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
          <img
            className="m-4"
            style={{ width: "25%" }}
            src={logo}
            alt="CustomerDB logo"
          />

          {props.header}

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
