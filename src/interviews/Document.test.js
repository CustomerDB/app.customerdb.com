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

import "mutationobserver-shim";

import * as firebase from "@firebase/testing";

import React, { useCallback, useRef, useState } from "react";
import { Route, MemoryRouter as Router, Routes } from "react-router-dom";

import Document from "./Document.js";
import FirebaseContext from "../util/FirebaseContext.js";
import ReactDOM from "react-dom";
import UserAuthContext from "../auth/UserAuthContext.js";
import { act } from "react-dom/test-utils";
import { v4 as uuidv4 } from "uuid";
import { wait } from "@testing-library/react";
import worker from "worker_threads";

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

  window.MessageChannel = worker.MessageChannel;

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
    if (!ReactDOM.unmountComponentAtNode(c)) {
      console.warn(`failed to unmount component at ${c}`);
    }
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
  let docRef = orgRef.collection("documents").doc(documentID);
  await docRef
    .collection("deltas")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => doc.ref.delete());
    });
  await docRef
    .collection("revisions")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => doc.ref.delete());
    });
  await docRef
    .collection("highlights")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => doc.ref.delete());
    });
  await docRef.delete();
  await orgRef.collection("members").doc(userObject.email).delete();
  await orgRef.delete();
};

const renderDocument = async (route, container) => {
  const path = "/org/:orgID/interviews/:documentID/:tabID";
  if (!container) {
    container = document.createElement("div");
    document.body.appendChild(container);
    containers.push(container);
  }

  let editor;

  await act(async () => {
    ReactDOM.render(
      <Router initialEntries={[route]}>
        <Routes>
          <Route
            path={path}
            element={
              <FirebaseContext.Provider value={app}>
                <UserAuthContext.Provider value={contextValue}>
                  <DocumentWrapper
                    onEditor={(e) => {
                      editor = e;
                    }}
                  />
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
  let container = await renderDocument(
    `/org/acme-0001/interviews/${documentID}/notes`
  );

  await wait(() => {
    const name = container.querySelector("#documentTitle");
    return expect(name.textContent).toBe("Test Document");
  });

  await wait(() => {
    const editorNode = container.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Hello");
  });
});

it("can edit a document", async () => {
  let container = await renderDocument(
    `/org/acme-0001/interviews/${documentID}/notes`
  );
  await wait(() => {
    const editorNode = container.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Hello");
  });

  await act(async () => {
    const editorNode = container.querySelector(".ql-editor");
    editorNode.innerHTML = "<p>Goodbye</p>";
  });

  let numDeltas;
  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  let unsubscribe = orgRef
    .collection("documents")
    .doc(documentID)
    .collection("deltas")
    .orderBy("timestamp")
    .where("timestamp", ">", new firebase.firestore.Timestamp(0, 0))
    .onSnapshot((snapshot) => {
      console.debug(
        "deltas:",
        snapshot.docs.map((d) => {
          return {
            ops: JSON.stringify(d.data().ops),
            timestamp: d.data().timestamp,
          };
        })
      );
      numDeltas = snapshot.size;
    });

  await wait(() => {
    return expect(numDeltas).toBe(2);
  });

  unsubscribe();

  await wait(() => {
    let editorNode = container.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Goodbye");
  });

  let container2 = await renderDocument(
    `/org/acme-0001/interviews/${documentID}/notes`
  );
  await wait(() => {
    let editorNode = container2.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Goodbye");
  });
});

it("can delete a document", async () => {
  let container = await renderDocument(
    `/org/acme-0001/interviews/${documentID}/notes`
  );
  await wait(() => {
    const editorNode = container.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Hello");
  });

  await act(async () => {
    const optionsButton = container.querySelector("#document-options");
    optionsButton.click();
  });

  await wait(() => {
    const archiveConfirmButton = document.querySelector(
      "#archive-document-button"
    );
    console.log("archiveConfirmButton: ", archiveConfirmButton);
    return expect(archiveConfirmButton).toBeTruthy();
  });

  await act(async () => {
    const archiveButton = document.querySelector("#archive-document-button");
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

it("can receive and render highlights in a document", async () => {
  let container = await renderDocument(
    `/org/acme-0001/interviews/${documentID}/notes`
  );
  await wait(() => {
    const editorNode = container.querySelector(".ql-editor");
    return expect(editorNode.textContent).toBe("Hello");
  });

  let db = adminApp.firestore();
  let orgRef = db.collection("organizations").doc(orgID);
  let highlightID = uuidv4();
  let docRef = orgRef.collection("documents").doc(documentID);
  let highlightRef = docRef.collection("highlights").doc(highlightID);

  await docRef.collection("deltas").add({
    editorID: "",
    ops: [
      { retain: 1 },
      {
        retain: 4,
        attributes: {
          highlight: {
            highlightID: highlightID,
            tagID: "fake-tag-id",
          },
        },
      },
    ],
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    userEmail: "system@example.com",
  });

  await wait(() => {
    const highlightNode = container.querySelector(".inline-highlight");
    return expect(highlightNode).toBeTruthy();
  });

  await wait(() => {
    const highlightNode = container.querySelector(".inline-highlight");
    return expect(highlightNode.textContent).toBe("ello");
  });

  await wait(() => {
    const highlightNode = container.querySelector(".inline-highlight");
    return expect(
      highlightNode.classList.contains(`highlight-${highlightID}`)
    ).toBe(true);
  });

  await wait(() => {
    const highlightNode = container.querySelector(".inline-highlight");
    return expect(highlightNode.classList.contains(`tag-fake-tag-id`)).toBe(
      true
    );
  });

  let highlightDocument;

  highlightRef.onSnapshot((doc) => (highlightDocument = doc.data()));

  await wait(() => {
    return expect(highlightDocument.ID).toBe(highlightID);
  });

  await wait(() => {
    return expect(highlightDocument.text).toBe("ello");
  });
});

const DocumentWrapper = ({ onEditor }) => {
  const reactQuillRef = useRef();
  return <Document reactQuillNotesRef={reactQuillRef} />;
};
