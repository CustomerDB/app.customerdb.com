import React, { useState, useEffect } from "react";

import { useParams, useNavigate } from "react-router-dom";

import Delta from "quill-delta";

import Button from "react-bootstrap/Button";

import Document from "./Document.js";
import DocumentRenameModal from "./DocumentRenameModal.js";

import Content from "../shell/Content.js";
import List from "../shell/List.js";
import Modal from "../shell/Modal.js";
import Options from "../shell/Options.js";
import Page from "../shell/Page.js";
import Scrollable from "../shell/Scrollable.js";

import { Loading } from "../Utils.js";

function initialDelta() {
  return new Delta([{ insert: "\n" }]);
}

export default function Data(props) {
  let navigate = useNavigate();
  let { documentID, orgID, tabID } = useParams();
  const [documents, setDocuments] = useState();
  const [addModalShow, setAddModalShow] = useState();
  const [newDocumentRef, setNewDocumentRef] = useState();

  useEffect(() => {
    return props.documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.log("documents snapshot received");

        let newDocuments = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newDocuments.push(data);
        });

        setDocuments(newDocuments);
      });
  }, []);

  if (!documents) {
    return <Loading />;
  }

  const options = (doc) => {
    let documentRef = props.documentsRef.doc(doc.ID);

    let renameOption = (
      <Options.Item
        name="Rename"
        modal={<DocumentRenameModal documentRef={documentRef} />}
      />
    );

    // onDelete is the delete confirm callback
    let onDelete = () => {
      documentRef.update({
        deletedBy: props.user.email,
        deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Remove focus from document if selected.
      if (documentID === doc.ID) {
        navigate(`/orgs/${orgID}/data`);
      }
    };

    let deleteOption = (
      <Options.Item
        name="Delete"
        modal={
          <Modal
            name="Delete document"
            footer={[
              <Button key="delete" variant="danger" onClick={onDelete}>
                Delete
              </Button>,
            ]}
          >
            <p>
              Are you sure you want to delete <b>{doc.name}</b>?
            </p>
          </Modal>
        }
      />
    );

    return (
      <Options>
        {renameOption}
        {deleteOption}
      </Options>
    );
  };

  const onAdd = () => {
    props.documentsRef
      .add({
        name: "Untitled Document",
        createdBy: props.user.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

        // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
        // we don't show the document anymore in the list. However, it should be
        // possible to recover the document by unsetting this field before
        // the deletion grace period expires and the GC sweep does a permanent delete.
        deletionTimestamp: "",
      })
      .then((newDocRef) => {
        setNewDocumentRef(newDocRef);

        let delta = initialDelta();

        navigate(`/orgs/${orgID}/data/${newDocRef.id}`);

        setAddModalShow(true);
      });
  };

  let documentItems = documents.map((doc) => (
    <List.Item
      key={doc.ID}
      name={doc.name}
      path={`/orgs/${orgID}/data/${doc.ID}`}
      active={documentID === doc.ID}
      options={options(doc)}
    />
  ));

  let content = undefined;
  if (documentID) {
    content = (
      <Document
        key={documentID}
        orgID={orgID}
        documentID={documentID}
        tabID={tabID}
        navigate={navigate}
        documentsRef={props.documentsRef}
        tagGroupsRef={props.tagGroupsRef}
        peopleRef={props.peopleRef}
        user={props.user}
      />
    );
  }

  let addModal = (
    <DocumentRenameModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      documentRef={newDocumentRef}
    />
  );

  return (
    <Page>
      <List>
        <List.Search placeholder="Search in data..." />
        <List.Title>
          <List.Name>Customer Data</List.Name>
          <List.Add onClick={onAdd} />
          {addModal}
        </List.Title>
        <List.Items>
          <Scrollable>{documentItems}</Scrollable>
        </List.Items>
      </List>
      <Content>{content}</Content>
    </Page>
  );
}
