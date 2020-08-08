import React, { useCallback, useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";

import { useParams, useNavigate } from "react-router-dom";

import { nanoid } from "nanoid";

import Moment from "react-moment";

import Button from "react-bootstrap/Button";

import { initialDelta } from "./delta.js";
import Document from "./Document.js";
import DocumentCreateModal from "./DocumentCreateModal.js";
import DocumentRenameModal from "./DocumentRenameModal.js";

import ObsoleteList from "../shell/List.js";
import Modal from "../shell/Modal.js";
import Options from "../shell/Options.js";
import Page from "../shell/Page.js";
import Scrollable from "../shell/Scrollable.js";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import DescriptionIcon from "@material-ui/icons/Description";

import DataHelp from "./DataHelp.js";
import ContentsHelp from "./ContentsHelp.js";

import { Loading } from "../util/Utils.js";

export default function Data(props) {
  let { oauthClaims } = useContext(UserAuthContext);
  let { documentsRef } = useFirestore();
  let navigate = useNavigate();
  let { documentID, orgID } = useParams();
  const [documents, setDocuments] = useState();
  const [addModalShow, setAddModalShow] = useState();

  const { defaultTagGroupID } = useOrganization();

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

  useEffect(() => {
    console.log("defaultTagGroupID", defaultTagGroupID);
  }, [defaultTagGroupID]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    return documentsRef
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
  }, [documentsRef]);

  if (!documents) {
    return <Loading />;
  }

  const options = (doc) => {
    let documentRef = documentsRef.doc(doc.ID);

    let renameOption = (
      <Options.Item
        name="Rename"
        modal={<DocumentRenameModal documentRef={documentRef} />}
      />
    );

    // onDelete is the delete confirm callback
    let onDelete = () => {
      event("delete_data", {
        orgID: oauthClaims.orgID,
        userID: oauthClaims.user_id,
      });
      documentRef.update({
        deletedBy: oauthClaims.email,
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
    event("create_data", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let documentID = nanoid();

    documentsRef
      .doc(documentID)
      .set({
        ID: documentID,
        name: "Untitled Document",
        createdBy: oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

        latestSnapshot: { ops: initialDelta().ops },

        latestSnapshotTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

        tagGroupID: defaultTagGroupID || "",

        templateID: "",

        // This initial value is required.
        // Search indexing and compression are done as a pair of operations:
        // 1) Mark documents with needsIndex == false and
        //    deltas newer than latestSnapshotTimestamp
        // 2) Index documents with needsIndex == true.
        needsIndex: false,

        // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
        // we don't show the document anymore in the list. However, it should be
        // possible to recover the document by unsetting this field before
        // the deletion grace period expires and the GC sweep does a permanent delete.
        deletionTimestamp: "",
      })
      .then((newDocRef) => {
        navigate(`/orgs/${orgID}/data/${documentID}`);
        setAddModalShow(true);
      });
  };

  let documentItems = documents.map((doc) => (
    <ListItem
      onClick={() => {
        navigate(`/orgs/${orgID}/data/${doc.ID}`);
      }}
      selected={doc.ID == documentID}
    >
      <ListItemAvatar>
        <Avatar>
          <DescriptionIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={doc.name}
        secondary={<Moment fromNow date={doc.creationTimestamp.toDate()} />}
      />
    </ListItem>
  ));

  let content = undefined;
  if (documentID) {
    content = (
      <Document
        key={documentID}
        navigate={navigate}
        user={oauthClaims}
        options={options}
        reactQuillRef={reactQuillRef}
        editor={editor}
      />
    );
  } else if (documentItems.length > 0) {
    content = <ContentsHelp />;
  }

  let addModal = (
    <DocumentCreateModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      editor={editor}
    />
  );

  return (
    <Page>
      <ObsoleteList>
        <ObsoleteList.Search
          index={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX}
          path={(ID) => `/orgs/${orgID}/data/${ID}`}
        >
          <ObsoleteList.SearchBox placeholder="Search in data..." />
          <ObsoleteList.Title>
            <ObsoleteList.Name>Customer Data</ObsoleteList.Name>
            <ObsoleteList.Add onClick={onAdd} />
            {addModal}
          </ObsoleteList.Title>
          <ObsoleteList.Items>
            <Scrollable>
              <List>
                {documentItems.length > 0 ? documentItems : <DataHelp />}
              </List>
            </Scrollable>
          </ObsoleteList.Items>
        </ObsoleteList.Search>
      </ObsoleteList>
      {content}
    </Page>
  );
}
