import React from "react";

import { Link, useParams } from "react-router-dom";

import dataGraphic from "../assets/images/data.svg";
import arrowDown from "../assets/images/handdrawn-arrow-down.svg";

export default function DataHelp(props) {
  const { orgID } = useParams();

  return (
    <div style={{ padding: "0.5rem" }}>
      <div>
        <img
          style={{ width: "100%" }}
          src={dataGraphic}
          alt="Data illustration"
        />
      </div>
      <div>
        <b>Get started by adding a customer note or conversation.</b>
      </div>
      <br />
      <div>
        <p>
          Link customer data to <Link to={`/orgs/${orgID}/people`}>people</Link>
          . Then find patterns in your data using the{" "}
          <Link to={`/orgs/${orgID}/analyze`}>analyze</Link> tab.
        </p>
        <p>
          New documents start with a default tag group. You can set up tag
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
