import { Link, useParams } from "react-router-dom";

import React from "react";
import arrowDown from "../assets/images/handdrawn-arrow-down.svg";
import dataGraphic from "../assets/images/data.svg";

export default function InterviewsHelp(props) {
  const { orgID } = useParams();

  return (
    <div style={{ padding: "0.5rem" }}>
      <div>
        <img
          style={{ width: "100%" }}
          src={dataGraphic}
          alt="Interviews illustration"
        />
      </div>
      <div>
        <b>Get started by adding a customer interview.</b>
      </div>
      <br />
      <div>
        <p>
          Link customer interviews to{" "}
          <Link to={`/orgs/${orgID}/people`}>people</Link>. Then find patterns
          in your interviews using the{" "}
          <Link to={`/orgs/${orgID}/analyze`}>analyze</Link> tab.
        </p>
        <p>
          New interviews start with a default tag group. You can set up tag
          groups for your organization in{" "}
          <Link to={`/orgs/${orgID}/settings/tags`}>settings</Link>.
        </p>
      </div>
      <div style={{ textAlign: "right" }}>
        <img
          src={arrowDown}
          style={{ width: "5rem", marginRight: "2rem", marginTop: "4rem" }}
          alt="Arrow pointing to add button"
        />
      </div>
    </div>
  );
}
