import FocusContext from "./FocusContext.js";
import React from "react";
import { useState } from "react";

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
