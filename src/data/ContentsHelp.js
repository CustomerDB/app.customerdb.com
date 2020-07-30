import React from "react";

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
              <h4>Keep track of your customer notes and conversations</h4>
              <br />
              <h5>
                Tag customer data with themes here. Find patterns in the voice
                of the customer in the explore tab.
              </h5>
            </div>
          </div>
        </div>
      </div>
    </Content>
  );
}
