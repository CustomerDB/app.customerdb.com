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
  uid: "abcdefg",
  email: "someone@example.com",
  displayName: "Alice Fake",
  email_verified: true,
  photoURL: "https://lh3.googleusercontent.com/a-/fakeimage",
};

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);

  app = firebase.initializeTestApp({
    projectId: "customerdb-development",
    auth: userObject,
  });

  adminApp = firebase.initializeAdminApp({
    projectId: "customerdb-development",
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

  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  await orgRef
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
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

afterEach(async () => {
  await Promise.all(firebase.apps().map((app) => app.delete()));
});

it("can render the logged-in user's details", async () => {
  // Test first render and componentDidMount
  await act(async () => {
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

  await wait(() => {
    const name = container.querySelector("#displayName");
    return expect(name.textContent).toBe("Alice Fake");
  });
});
