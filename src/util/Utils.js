import React, { useContext } from "react";

import CircularProgress from "@material-ui/core/CircularProgress";
import FirebaseContext from "../util/FirebaseContext.js";

export function now() {
  let now = new Date();
  return now.toISOString();
}

export function Loading({text}) {
  return (
    <div className="outerContainer">
      <div className="spinnerContainer">
        <CircularProgress color="primary" />
        <p>{text}</p>
      </div>
    </div>
  );
}

export function useLogout() {
  const firebase = useContext(FirebaseContext);
  return () => {
    firebase.auth().signOut();
  };
}

export function checkReturn(e) {
  if (e.key === "Enter") {
    e.target.blur();
  }
}
