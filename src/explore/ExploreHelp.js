import React from "react";

import { ArrowUp } from "react-bootstrap-icons";

import exploreGraphic from "../assets/images/explore.svg";

export default function ExploreHelp(props) {
  return (
    <div className="roundedBorders" style={{ padding: "0.5rem" }}>
      <div style={{ display: "flex" }}>
        <div>
          <b>
            Create a dataset to start exploring patterns in your customer data.
          </b>
        </div>
        <div>
          <ArrowUp size={40} />
        </div>
      </div>
      <br />
      <div>
        <p>
          This is where the work you've done shines. See quotes from up to ten
          people at once. Drag similar cards together to form groups. Your whole
          team can help, it's multi-player!
        </p>
        <p>
          As you're exploring the meaning behind your customers' words,
          CustomerDB automatically builds a report to put those insights in
          context.
        </p>
      </div>
      <div>
        <img
          style={{ width: "100%" }}
          src={exploreGraphic}
          alt="Explore illustration"
        />
      </div>
    </div>
  );
}
