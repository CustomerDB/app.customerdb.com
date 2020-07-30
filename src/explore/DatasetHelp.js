import React from "react";

import Content from "../shell/Content.js";

import exploreGraphic from "../assets/images/explore.svg";

export default function DatasetHelp(props) {
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
                src={exploreGraphic}
                alt="Eplore illustration"
              />
            </div>
            <div
              style={{ maxWidth: "25rem" }}
              className="justify-content-center align-self-center"
            >
              <h4>Explore your customer data</h4>
              <br />
              <h5>
                Collaborate with your team to find patterns in verbatims from
                multiple customers.
              </h5>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
}
