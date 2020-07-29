import React from "react";

import { ArrowUp } from "react-bootstrap-icons";

import dataGraphic from "../assets/images/data.svg";

export default function DataHelp(props) {
  return (
    <div className="roundedBorders" style={{ padding: "0.5rem" }}>
      <div style={{ display: "flex" }}>
        <div>
          <b>
            Get started by adding your next customer notes and conversations to
            CustomerDB.
          </b>
        </div>
        <div>
          <ArrowUp size={40} />
        </div>
      </div>
      <br />
      <div>
        <p>
          After adding customer data, you can link customer data to customer
          profiles. Then find patterns in your data using the explore tab.
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
