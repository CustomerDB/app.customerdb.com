import React from "react";

import SearchDropdown from "./Dropdown.js";

export default function ExampleDropdown(props) {
  return (
    <div>
      <h3>Search people</h3>
      <SearchDropdown
        index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
        default="niklas"
        onChange={(ID, name) => {
          console.log(`${name} with ID ${ID} selected`);
        }}
      />
    </div>
  );
}
