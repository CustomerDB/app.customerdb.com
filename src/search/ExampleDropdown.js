import React from "react";

import SearchDropdown from "./Dropdown.js";

export default function ExampleDropdown(props) {
  return (
    <div>
      <h3>Search people</h3>
      <SearchDropdown
        index="prod_PEOPLE"
        default="niklas"
        onChange={(ID, name) => {
          console.log(`${name} with ID ${ID} selected`);
        }}
      />
    </div>
  );
}
