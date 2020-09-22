import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Avatar from "@material-ui/core/Avatar";
import ContentsHelp from "./ContentsHelp.js";
import DescriptionIcon from "@material-ui/icons/Description";
import Document from "./Document.js";
import DocumentCreateModal from "./DocumentCreateModal.js";
import AddIcon from "@material-ui/icons/Add";
import FirebaseContext from "../util/FirebaseContext.js";
import Fab from "@material-ui/core/Fab";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import InterviewsHelp from "./InterviewsHelp.js";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import Shell from "../shell/Shell.js";
import TheatersIcon from "@material-ui/icons/Theaters";
import UploadVideoDialog from "./UploadVideoDialog.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { connectHits } from "react-instantsearch-dom";
import event from "../analytics/event.js";
import { initialDelta } from "../editor/delta.js";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";
import { v4 as uuidv4 } from "uuid";

const useStyles = makeStyles((theme) => ({
  root: {
    transform: "translateZ(0px)",
    flexGrow: 1,
  },
}));

export default function Interviews(props) {
  const [addModalShow, setAddModalShow] = useState(false);
  const [uploadModalShow, setUploadModalShow] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showResults, setShowResults] = useState();
  const [openDial, setOpenDial] = useState(false);

  const { defaultTagGroupID } = useOrganization();

  const classes = useStyles();

  const navigate = useNavigate();

  let { documentID, orgID } = useParams();
  let { documentsRef } = useFirestore();
  let { oauthClaims } = useContext(UserAuthContext);
  let firebase = useContext(FirebaseContext);

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

  const onAddDocument = () => {
    event(firebase, "create_interview", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let documentID = uuidv4();

    return documentsRef
      .doc(documentID)
      .set({
        ID: documentID,
        name: "Untitled Interview",
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),

        tagGroupID: defaultTagGroupID || "",

        templateID: "",

        // This initial value is required.
        // Search indexing and compression are done as a pair of operations:
        // 1) Mark documents with needsIndex == false and
        //    deltas newer than latest revision timestamp
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
          .collection("revisions")
          .add({
            delta: { ops: initialDelta().ops },
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
      })
      .then(() => {
        navigate(`/orgs/${orgID}/interviews/${documentID}`);
      });
  };

  const onUploadVideo = () => {
    setUploadModalShow(true);
  };

  const dataListItem = (ID, name, date, transcript) => (
    <ListItem
      button
      key={ID}
      selected={ID === documentID}
      onClick={() => {
        navigate(`/orgs/${orgID}/interviews/${ID}`);
      }}
    >
      <ListItemAvatar>
        <Avatar>{transcript ? <TheatersIcon /> : <DescriptionIcon />}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={name}
        secondary={date && <Moment fromNow date={date} />}
      />
    </ListItem>
  );

  let documentItems = documents.map((doc) =>
    dataListItem(
      doc.ID,
      doc.name,
      doc.creationTimestamp && doc.creationTimestamp.toDate(),
      doc.transcription
    )
  );

  const SearchResults = connectHits((result) => {
    return result.hits.map((hit) => {
      // creationTimestamp is indexed as seconds since unix epoch
      let creationDate = new Date(hit.creationTimestamp * 1000);

      // TODO: Get content type from index object.
      return dataListItem(hit.objectID, hit.name, creationDate, false);
    });
  });

  let list = (
    <ListContainer>
      <Scrollable>
        {showResults ? (
          <SearchResults />
        ) : (
          <List>
            {documentItems.length > 0 ? documentItems : <InterviewsHelp />}
          </List>
        )}
      </Scrollable>
      <Fab
        style={{ position: "absolute", bottom: "15px", right: "15px" }}
        color="secondary"
        aria-label="add"
        onClick={() => {
          onAddDocument().then(() => {
            setAddModalShow(true);
          });
          setOpenDial(false);
        }}
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
    content = (
      <Hidden mdDown>
        <ContentsHelp />
      </Hidden>
    );
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

  let uploadModal = (
    <UploadVideoDialog
      open={uploadModalShow}
      setOpen={(value) => {
        setUploadModalShow(value);
      }}
    />
  );

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX,
      setShowResults: (value) => {
        setShowResults(value);
      },
    };
  }

  return (
    <Shell title="Interviews" search={searchConfig}>
      <Grid container className="fullHeight">
        {list}
        {content}
        {addModal}
        {uploadModal}
      </Grid>
    </Shell>
  );
}
