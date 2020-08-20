import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";

export function now() {
  let now = new Date();
  return now.toISOString();
}

export function Loading() {
  return (
    <div className="outerContainer">
      <div className="spinnerContainer">
        <CircularProgress color="primary" />
      </div>
    </div>
  );
}

export function logout() {
  return window.firebase.auth().signOut();
}

export function checkReturn(e) {
  if (e.key === "Enter") {
    e.target.blur();
  }
}
