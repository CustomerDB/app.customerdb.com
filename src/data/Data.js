import React, { useCallback, useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";

import { useParams, useNavigate } from "react-router-dom";

import { connectHits } from "react-instantsearch-dom";

import { nanoid } from "nanoid";

import Moment from "react-moment";

import Button from "react-bootstrap/Button";

import { initialDelta } from "./delta.js";
import Document from "./Document.js";
import DocumentCreateModal from "./DocumentCreateModal.js";
import DocumentRenameModal from "./DocumentRenameModal.js";

import Shell from "../shell/Shell.js";
import ListContainer from "../shell/ListContainer";

import Modal from "../shell_obsolete/Modal.js";
import Options from "../shell_obsolete/Options.js";
import Scrollable from "../shell_obsolete/Scrollable.js";

import AddIcon from "@material-ui/icons/Add";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import DescriptionIcon from "@material-ui/icons/Description";
import Fab from "@material-ui/core/Fab";
import Grid from "@material-ui/core/Grid";

import DataHelp from "./DataHelp.js";
import ContentsHelp from "./ContentsHelp.js";

export default function Data(props) {
  let { oauthClaims } = useContext(UserAuthContext);
  let { documentsRef } = useFirestore();
  let navigate = useNavigate();
  let { documentID, orgID } = useParams();
  const [documents, setDocuments] = useState([]);
  const [addModalShow, setAddModalShow] = useState();
  const [showResults, setShowResults] = useState();

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
      .then(() => {
        documentsRef
          .doc(documentID)
          .collection("snapshots")
          .add({
            delta: { ops: initialDelta().ops },
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          });
      })
      .then(() => {
        navigate(`/orgs/${orgID}/data/${documentID}`);
        setAddModalShow(true);
      });
  };

  const dataListItem = (ID, name, timestamp) => (
    <ListItem
      button
      key={ID}
      selected={ID === documentID}
      onClick={() => {
        navigate(`/orgs/${orgID}/data/${ID}`);
      }}
    >
      <ListItemAvatar>
        <Avatar>
          <DescriptionIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={name}
        secondary={timestamp && <Moment fromNow date={timestamp} />}
      />
    </ListItem>
  );

  let documentItems = documents.map((doc) =>
    dataListItem(
      doc.ID,
      doc.name,
      doc.creationTimestamp && doc.creationTimestamp.toDate()
    )
  );

  const SearchResults = connectHits((result) => {
    return result.hits.map((hit) =>
      dataListItem(hit.objectID, hit.name, hit.creationTimestamp)
    );
  });

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
    <Shell
      title="Data"
      search={{
        index: process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX,
        setShowResults: (value) => {
          setShowResults(value);
        },
      }}
    >
      <Grid container alignItems="stretch">
        <ListContainer>
          <Scrollable>
            {showResults ? (
              <SearchResults />
            ) : (
              <List>
                {documentItems.length > 0 ? documentItems : <DataHelp />}
              </List>
            )}
          </Scrollable>
          <Fab
            style={{ position: "absolute", bottom: "15px", right: "15px" }}
            color="secondary"
            aria-label="add"
            onClick={onAdd}
          >
            <AddIcon />
          </Fab>
        </ListContainer>
        {content}
        {addModal}
      </Grid>
    </Shell>
  );
}
