import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

import Content from "../shell/Content.js";

import dataGraphic from "../assets/images/data.svg";

export default function ContentsHelp(props) {
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
                src={dataGraphic}
                alt="Data illustration"
              />
            </div>
            <div
              style={{ maxWidth: "25rem" }}
              className="justify-content-center align-self-center"
            >
              <h4>Manage your customer notes and conversations</h4>
              <h5>
                Tag customer data with themes here and analyze interviews to
                find the voice of your customer in the explore tab.
              </h5>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
}
