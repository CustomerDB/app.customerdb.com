import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AddIcon from "@material-ui/icons/Add";
import Avatar from "@material-ui/core/Avatar";
import ContentsHelp from "./ContentsHelp.js";
import DataHelp from "./DataHelp.js";
import DescriptionIcon from "@material-ui/icons/Description";
import Document from "./Document.js";
import DocumentCreateModal from "./DocumentCreateModal.js";
import Fab from "@material-ui/core/Fab";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import Shell from "../shell/Shell.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { connectHits } from "react-instantsearch-dom";
import event from "../analytics/event.js";
import { initialDelta } from "./delta.js";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";

export default function Data(props) {
  const [addModalShow, setAddModalShow] = useState();
  const [documents, setDocuments] = useState([]);
  const [showResults, setShowResults] = useState();
  const { defaultTagGroupID } = useOrganization();

  const navigate = useNavigate();

  let { documentID, orgID } = useParams();
  let { documentsRef } = useFirestore();
  let { oauthClaims } = useContext(UserAuthContext);

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

  let list = (
    <ListContainer>
      <Scrollable>
        {showResults ? (
          <SearchResults />
        ) : (
          <List>{documentItems.length > 0 ? documentItems : <DataHelp />}</List>
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
  );

  if (documentID) {
    // Optionally hide the list if the viewport is too small
    list = <Hidden mdDown>{list}</Hidden>;
  }

  let content = undefined;
  if (documentID) {
    content = (
      <Document
        key={documentID}
        navigate={navigate}
        user={oauthClaims}
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
      <Grid container className="fullHeight">
        {list}
        {content}
        {addModal}
      </Grid>
    </Shell>
  );
}
