import React from "react";
import analyzeGraphic from "../assets/images/analyze.svg";

export default function AnalysisHelp(props) {
  return (
    <div>
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
                src={analyzeGraphic}
                alt="Eplore illustration"
              />
            </div>
            <div
              style={{ maxWidth: "25rem" }}
              className="justify-content-center align-self-center"
            >
              <h4>Analyze your customer interviews</h4>
              <br />
              <h5>
                Collaborate with your team to find patterns in verbatims from
                multiple customers.
              </h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
