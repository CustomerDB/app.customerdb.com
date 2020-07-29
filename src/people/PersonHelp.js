import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

import Content from "../shell/Content.js";

import personGraphic from "../assets/images/person.svg";

export default function PersonHelp(props) {
  return (
    <Content>
      <div className="d-flex flex-column w-100 h-100 justify-content-center align-self-center">
        <div
          className="d-flex flex-column justify-content-center align-self-center"
          style={{ padding: "1rem" }}
        >
          <div className="d-flex justify-content-center align-self-center">
            <div
              style={{ width: "30rem" }}
              className="d-flex justify-content-center align-self-center"
            >
              <img
                style={{ width: "100%" }}
                src={personGraphic}
                alt="Person illustration"
              />
            </div>
            <div>
              <h4>Organize your customer contacts</h4>
              <h5>
                The more information you add here, the more insights you can get
                during your analysis.
              </h5>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
}
