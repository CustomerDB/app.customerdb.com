import React from "react";

import { ArrowUp } from "react-bootstrap-icons";

import personGraphic from "../assets/images/person.svg";

export default function PeopleHelp(props) {
  return (
    <div className="roundedBorders" style={{ padding: "0.5rem" }}>
      <div style={{ display: "flex" }}>
        <div>
          <b>
            Start by adding your customers and people you interact with by
            clicking the plus button
          </b>
        </div>
        <div>
          <ArrowUp size={40} />
        </div>
      </div>
      <br />
      <div>
        <p>
          CustomerDB makes it easy to connect data about your customers
          (location, industry, company size etc) with what they tell you. In
          this way, you can know which customers wants what, who have certain
          problems and feels which way.
        </p>
        <p>
          The more information you add here, the more insights you can get
          during your analysis.
        </p>
      </div>
      <div>
        <img
          style={{ width: "100%" }}
          src={personGraphic}
          alt="Person illustration"
        />
      </div>
    </div>
  );
}
