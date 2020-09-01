import * as firebase from "@firebase/testing";

import { Route, MemoryRouter as Router, Routes } from "react-router-dom";

import FirebaseContext from "../util/FirebaseContext.js";
import Profile from "./Profile.js";
import React from "react";
import ReactDOM from "react-dom";
import UserAuthContext from "../auth/UserAuthContext.js";
import { act } from "react-dom/test-utils";
import { wait } from "@testing-library/react";

let container;
let app;
let adminApp;
let contextValue;

const orgID = "acme-0001";
const userObject = {
  uid: "PFaAIMTCd6aJnjWEmE0u2RqcvN43",
  email: "niklas@quantap.com",
  displayName: "Niklas Nielsen",
  email_verified: true,
  photoURL:
    "https://lh3.googleusercontent.com/a-/AOh14GhXrb7nfKHUZgsQNMpGCjL2YU2UPgAeDDDPN8HXDw",
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);

  app = firebase.initializeTestApp({
    projectId: "customerdb-local",
    auth: userObject,
  });

  adminApp = firebase.initializeAdminApp({
    projectId: "customerdb-local",
  });

  contextValue = {
    oauthUser: userObject,
    oauthClaims: {
      name: userObject.displayName,
      email: userObject.email,
      picture: userObject.photoURL,
      admin: false,
      orgID: orgID,
      email_verified: true,
      user_id: userObject.uid,
    },
    oauthLoading: false,
  };
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

const setupData = () => {
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  return orgRef
    .set({
      name: "Acme 0001",
    })
    .then(() => {
      return orgRef.collection("members").doc(userObject.email).set({
        admin: true,
        active: true,
        invited: false,
        displayName: userObject.displayName,
        email: userObject.email,
        uid: userObject.uid,
        photoURL: userObject.photoURL,
      });
    });
};

it("can render and update a counter", async () => {
  // Test first render and componentDidMount
  await act(async () => {
    await setupData().then(() => {
      let route = "/org/acme-0001";
      let path = "/org/:orgID";

      ReactDOM.render(
        <Router initialEntries={[route]}>
          <Routes>
            <Route
              path={path}
              element={
                <FirebaseContext.Provider value={app}>
                  <UserAuthContext.Provider value={contextValue}>
                    <Profile />
                  </UserAuthContext.Provider>
                </FirebaseContext.Provider>
              }
            ></Route>
          </Routes>
        </Router>,
        container
      );
    });
  });

  await wait(() => {
    const name = container.querySelector("#displayName");
    return expect(name.textContent).toBe("Niklas Nielsen");
  });
});
