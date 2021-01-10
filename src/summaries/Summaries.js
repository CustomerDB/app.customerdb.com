import React, { useState } from "react";
import { Search } from "../shell/Search.js";
import Grid from "@material-ui/core/Grid";

export default function Summaries() {
  // state
  const [showResults, setShowResults] = useState();

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX,
      setShowResults: (value) => {
        setShowResults(value);
      },
    };
  }

  return (
    <Search search={searchConfig}>
      <Grid
        container
        className="fullHeight"
        style={{ position: "relative" }}
      ></Grid>
    </Search>
  );
}
