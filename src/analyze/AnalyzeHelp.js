import React from "react";
import analyzeGraphic from "../assets/images/analyze.svg";
import arrowDown from "../assets/images/handdrawn-arrow-down.svg";

export default function AnalyzeHelp(props) {
  return (
    <div style={{ padding: "0.5rem" }}>
      <div>
        <img
          style={{ width: "100%" }}
          src={analyzeGraphic}
          alt="Analysis illustration"
        />
      </div>
      <div>
        <b>
          Create an analysis to start exploring patterns in your customer
          interviews.
        </b>
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
      <div style={{ textAlign: "right" }}>
        <img
          src={arrowDown}
          style={{ width: "5rem", marginRight: "2rem" }}
          alt="Arrow pointing to add button"
        />
      </div>
    </div>
  );
}
