import "mutationobserver-shim";

import * as firebase from "@firebase/testing";

import React, { useCallback, useState } from "react";
import { Route, MemoryRouter as Router, Routes } from "react-router-dom";

import Document from "./Document.js";
import FirebaseContext from "../util/FirebaseContext.js";
import ReactDOM from "react-dom";
import UserAuthContext from "../auth/UserAuthContext.js";
import { act } from "react-dom/test-utils";
import { wait } from "@testing-library/react";

let app;
let adminApp;
let contextValue;
let containers;

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
  window.document.getSelection = function () {};

  containers = [];

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

  await setupData();
});

afterEach(async () => {
  containers.forEach((c) => {
    document.body.removeChild(c);
  });
  containers = [];
  await cleanupData();
  await Promise.all(firebase.apps().map((app) => app.delete()));
});

const setupData = async () => {
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  await orgRef.set({
    name: "Acme 0001",
  });
  await orgRef.collection("members").doc(userObject.email).set({
    admin: true,
    active: true,
    invited: false,
    displayName: userObject.displayName,
    email: userObject.email,
    uid: userObject.uid,
    photoURL: userObject.photoURL,
  });
  await orgRef.collection("documents").doc(documentID).set({
    ID: documentID,
    name: "Test Document",
    createdBy: userObject.email,
    creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    tagGroupID: "",
    templateID: "",
    needsIndex: false,
    deletionTimestamp: "",
  });
  await orgRef
    .collection("documents")
    .doc(documentID)
    .collection("deltas")
    .add({
      editorID: "",
      ops: [{ insert: "Hello" }],
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      userEmail: "system@example.com",
    });
};

const cleanupData = async () => {
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  await orgRef
    .collection("documents")
    .doc(documentID)
    .collection("deltas")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => doc.ref.delete());
    });
  await orgRef
    .collection("documents")
    .doc(documentID)
    .collection("revisions")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => doc.ref.delete());
    });
  await orgRef.collection("documents").doc(documentID).delete();
  await orgRef.collection("members").doc(userObject.email).delete();
  await orgRef.delete();
};

const renderDocument = async (route, container) => {
  const path = "/org/:orgID/data/:documentID";
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);
  }
  await act(async () => {
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

  return container;
};

it("can render an existing document", async () => {
  let container = await renderDocument(`/org/acme-0001/data/${documentID}`);

  await wait(() => {
    const name = container.querySelector("#documentTitle");
    return expect(name.textContent).toBe("Test Document");
  });

  await wait(() => {
    const editor = container.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Hello");
  });
});

it("can edit a document", async () => {
  let container = await renderDocument(`/org/acme-0001/data/${documentID}`);
  await wait(() => {
    const editor = container.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Hello");
  });

  await act(async () => {
    const editor = container.querySelector(".ql-editor");
    editor.innerHTML = "<p>Goodbye</p>";
  });

  let numDeltas;
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  let unsubscribe = orgRef
    .collection("documents")
    .doc(documentID)
    .collection("deltas")
    .onSnapshot((snapshot) => {
      numDeltas = snapshot.size;
    });

  await wait(() => {
    return expect(numDeltas).toBe(2);
  });

  unsubscribe();

  await wait(() => {
    let editor = container.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Goodbye");
  });

  let container2 = await renderDocument(`/org/acme-0001/data/${documentID}`);
  await wait(() => {
    let editor = container2.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Goodbye");
  });
});

it("can delete a document", async () => {
  let container = await renderDocument(`/org/acme-0001/data/${documentID}`);
  await wait(() => {
    const editor = container.querySelector(".ql-editor");
    return expect(editor.textContent).toBe("Hello");
  });

  await act(async () => {
    const archiveButton = container.querySelector("#archive-document-button");
    archiveButton.click();
  });

  await wait(() => {
    const archiveConfirmButton = document.querySelector(
      "#archive-document-dialog-button"
    );
    return expect(archiveConfirmButton).toBeTruthy();
  });

  await act(async () => {
    const archiveConfirmButton = document.querySelector(
      "#archive-document-dialog-button"
    );
    archiveConfirmButton.click();
  });

  let deleted = false;
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  let unsubscribe = orgRef
    .collection("documents")
    .doc(documentID)
    .onSnapshot((doc) => {
      if (!doc.exists) return;
      let data = doc.data();
      deleted = data.deletionTimestamp !== "";
    });

  await wait(() => {
    return expect(deleted).toBe(true);
  });

  unsubscribe();
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
