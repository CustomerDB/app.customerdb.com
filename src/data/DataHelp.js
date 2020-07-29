import React from "react";

import { Link, useParams } from "react-router-dom";

import { ArrowUp } from "react-bootstrap-icons";

import dataGraphic from "../assets/images/data.svg";

export default function DataHelp(props) {
  const { orgID } = useParams();

  return (
    <div className="roundedBorders" style={{ padding: "0.5rem" }}>
      <div style={{ display: "flex" }}>
        <div>
          <b>Get started by adding a customer note or conversation.</b>
        </div>
        <div>
          <ArrowUp size={40} />
        </div>
      </div>
      <br />
      <div>
        <p>
          Link customer data to <Link to={`/orgs/${orgID}/people`}>people</Link>
          . Then find patterns in your data using the{" "}
          <Link to={`/orgs/${orgID}/explore`}>explore</Link> tab.
        </p>
        <p>
          New documents start with a default tag group. You can set up tag
          groups for your organization in{" "}
          <Link to={`/orgs/${orgID}/settings/tags`}>settings</Link>.
        </p>
      </div>
      <div>
        <img
          style={{ width: "100%" }}
          src={dataGraphic}
          alt="Data illustration"
        />
      </div>
    </div>
  );
}
