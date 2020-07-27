import React from "react";

const FocusContext = React.createContext({
  focus: undefined,
  setFocus: () => {},
});

export default FocusContext;
