import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

import Content from "../shell/Content.js";

import personGraphic from "../assets/images/person.svg";

export default function PersonHelp(props) {
  return (
    <Content>
      <div className="roundedBorders" style={{ padding: "1rem" }}>
        <div className="d-flex">
          <div>
            <h4>Organize your customer contacts</h4>
            <p>
              This is the space to organize your customer contacts. This helps
              us connect data about your customers (location, industry, company
              size etc) with what they tell you. In this way, you can know which
              customers wants what, who have certain problems and feels which
              way.
            </p>

            <p>
              The more information you add here, the more insights you can get
              during your analysis.
            </p>
          </div>
          <div style={{ width: "30rem" }}>
            <img
              style={{ width: "100%" }}
              src={personGraphic}
              alt="Person illustration"
            />
          </div>
        </div>
      </div>
    </Content>
  );
}
