// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useContext } from "react";

import CircularProgress from "@material-ui/core/CircularProgress";
import FirebaseContext from "../util/FirebaseContext.js";

export function now() {
  let now = new Date();
  return now.toISOString();
}

export function Loading({ text }) {
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
