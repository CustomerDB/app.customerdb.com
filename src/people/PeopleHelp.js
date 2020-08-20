import React from "react";

import personGraphic from "../assets/images/person.svg";
import arrowDown from "../assets/images/handdrawn-arrow-down.svg";

export default function PeopleHelp(props) {
  return (
    <div style={{ padding: "0.5rem" }}>
      <div>
        <img
          style={{ width: "100%" }}
          src={personGraphic}
          alt="Person illustration"
        />
      </div>
      <div>
        <b>Start by adding a customer or user you interact with.</b>
      </div>
      <br />
      <div>
        <p>
          CustomerDB makes it easy to connect data about your customers such as
          location, industry or company size with direct quotes gathered by your
          entire team.
        </p>
        <p>
          Then you can explore by segment to understand shared problems and
          sentiments.
        </p>
        <p>
          The more information you add here, the more insights you can get
          during your analysis.
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <img
          src={arrowDown}
          style={{ width: "4rem", marginRight: "2rem" }}
          alt="Arrow pointing to add button"
        />
      </div>
    </div>
  );
}
