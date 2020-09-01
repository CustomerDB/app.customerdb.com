import * as firebase from "@firebase/testing";

import React, { useCallback, useState } from "react";
import { Route, MemoryRouter as Router, Routes } from "react-router-dom";

import Document from "./Document.js";
import FirebaseContext from "../util/FirebaseContext.js";
import ReactDOM from "react-dom";
import UserAuthContext from "../auth/UserAuthContext.js";
import { act } from "react-dom/test-utils";
import { nanoid } from "nanoid";
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

const documentID = "fake-document-id";

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
      return orgRef.collection("documents").doc(documentID).set({
        ID: documentID,
        name: "Test Document",
        createdBy: userObject.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        tagGroupID: "",
        templateID: "",
        needsIndex: false,
        deletionTimestamp: "",
      });
    });
};

it("can render an existing document", async () => {
  // Test first render and componentDidMount
  await act(async () => {
    await setupData();
    let route = `/org/acme-0001/data/${documentID}`;
    let path = "/org/:orgID/data/:documentID";

    ReactDOM.render(
      <Router initialEntries={[route]}>
        <Routes>
          <Route
            path={path}
            element={
              <FirebaseContext.Provider value={app}>
                <UserAuthContext.Provider value={contextValue}>
                  <DocumentWrapper />
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
    const name = container.querySelector("#documentTitle");
    return expect(name.textContent).toBe("Test Document");
  });
});

const DocumentWrapper = (props) => {
  const [editor, setEditor] = useState();
  const reactQuillRef = useCallback(
    (current) => {
      if (!current) {
        setEditor();
        return;
      }
      setEditor(current.getEditor());
    },
    [setEditor]
  );

  return <Document editor={editor} reactQuillRef={reactQuillRef} />;
};
