import * as firebase from "@firebase/testing";

import React, { useCallback, useState } from "react";
import { Route, MemoryRouter as Router, Routes } from "react-router-dom";

import Document from "./Document.js";
import FirebaseContext from "../util/FirebaseContext.js";
import MutationObserver from "mutation-observer";
import ReactDOM from "react-dom";
import UserAuthContext from "../auth/UserAuthContext.js";
import { act } from "react-dom/test-utils";
import { wait } from "@testing-library/react";

global.MutationObserver = MutationObserver;

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

const setupData = () => {
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  return orgRef
    .set({
      name: "Acme 0001",
    })
    .then(() => {
      return orgRef
        .collection("documents")
        .doc(documentID)
        .set({
          ID: documentID,
          name: "Test Document",
          createdBy: userObject.email,
          creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
          tagGroupID: "",
          templateID: "",
          needsIndex: false,
          deletionTimestamp: "",
        })
        .then(() => {
          return orgRef
            .collection("documents")
            .doc(documentID)
            .collection("deltas")
            .add({
              editorID: "",
              ops: [{ insert: "Hello" }],
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              userEmail: "system@example.com",
            });
        });
    });
};

it("can render an existing document", async () => {
  window.document.getSelection = function () {};

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

  await wait(() => {
    const editor = container.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Hello");
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
