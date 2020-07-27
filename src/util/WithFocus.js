import React from "react";
import { useState, useEffect } from "react";

import FocusContext from "./FocusContext.js";

export default function WithFocus(props) {
  const [focus, setFocus] = useState(null);

  let contextValue = {
    focus: focus,
    setFocus: setFocus,
  };

  return (
    <FocusContext.Provider value={contextValue}>
      {props.children}
    </FocusContext.Provider>
  );
}
