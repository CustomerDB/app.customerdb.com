import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Avatar from "@material-ui/core/Avatar";
import DescriptionIcon from "@material-ui/icons/Description";
import Document from "./Document.js";
import DocumentFromGuideModal from "./DocumentFromGuideModal.js";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import EmptyStateHelp from "../util/EmptyStateHelp.js";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Tooltip from "@material-ui/core/Tooltip";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import { Search } from "../shell/Search.js";
import TheatersIcon from "@material-ui/icons/Theaters";
import UserAuthContext from "../auth/UserAuthContext.js";
import { connectHits } from "react-instantsearch-dom";
import event from "../analytics/event.js";
import { initialDelta } from "../editor/delta.js";
import short from "short-uuid";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";
import { v4 as uuidv4 } from "uuid";

export default function InterviewList({ create, fromGuide }) {
  const [addModalShow, setAddModalShow] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [showResults, setShowResults] = useState();

  const { defaultTagGroupID } = useOrganization();

  const navigate = useNavigate();

  let { documentID, orgID } = useParams();
  let { documentsRef, callsRef } = useFirestore();
  let { oauthClaims } = useContext(UserAuthContext);
  let firebase = useContext(FirebaseContext);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    return documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.debug("documents snapshot received");

        let newDocuments = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newDocuments.push(data);
        });

        setDocuments(newDocuments);
      });
  }, [documentsRef]);

  useEffect(() => {
    if (!create || !callsRef || !oauthClaims.user_id || !oauthClaims.email) {
      return;
    }

    event(firebase, "create_interview", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    let documentID = uuidv4();
    let callID = short.generate();

    callsRef
      .doc(callID)
      .set({
        ID: callID,
        documentID: documentID,
        organizationID: orgID,
        token: short.generate().slice(0, 6),
        transcriptionID: "",
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        callStartedTimestamp: "",
        callEndedTimestamp: "",
        deletionTimestamp: "",
      })
      .then(
        documentsRef.doc(documentID).set({
          ID: documentID,
          name: "Untitled Interview",
          createdBy: oauthClaims.email,
          creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),

          callID: callID,

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
      )
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
      })
      .then(() => {
        if (fromGuide) {
          setAddModalShow(true);
        }
      });
  }, [
    create,
    callsRef,
    defaultTagGroupID,
    documentsRef,
    firebase,
    fromGuide,
    navigate,
    oauthClaims,
    orgID,
  ]);

  const dataListItem = (
    ID,
    name,
    date,
    transcript,
    personName,
    personImageURL
  ) => {
    let avatar = (
      <Avatar alt={personName}>
        {transcript ? <TheatersIcon /> : <DescriptionIcon />}
      </Avatar>
    );

    if (personImageURL) {
      avatar = <Avatar alt={personName} src={personImageURL} />;
    }

    if (personName) {
      avatar = <Tooltip title={personName}>{avatar}</Tooltip>;
    }

    return (
      <ListItem
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
        }}
        button
        key={ID}
        selected={ID === documentID}
        onClick={() => {
          navigate(`/orgs/${orgID}/interviews/${ID}`);
        }}
      >
        <ListItemAvatar>{avatar}</ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={date && <Moment fromNow date={date} />}
        />
      </ListItem>
    );
  };

  let documentItems = documents.map((doc) =>
    dataListItem(
      doc.ID,
      doc.name,
      doc.creationTimestamp && doc.creationTimestamp.toDate(),
      doc.transcription,
      doc.personName,
      doc.personImageURL
    )
  );

  const SearchResults = connectHits((result) => {
    return result.hits.map((hit) => {
      // creationTimestamp is indexed as seconds since unix epoch
      let creationDate = new Date(hit.creationTimestamp * 1000);

      // TODO: Get content type from index object.
      return dataListItem(
        hit.objectID,
        hit.name,
        creationDate,
        false,
        hit.personName,
        hit.personImageURL
      );
    });
  });

  if (documentItems.length === 0) {
    return (
      <EmptyStateHelp
        title="Get started by adding an interview"
        description="Interviews are where it all begins. Add notes and transcripts from your customer conversations here and start creating customer quotes."
        buttonText="Create interview"
        path={`/orgs/${orgID}/interviews/create`}
      />
    );
  }

  let list = (
    <ListContainer>
      <Scrollable>
        {showResults ? (
          <SearchResults />
        ) : (
          <List style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
            {documentItems}
          </List>
        )}
      </Scrollable>
    </ListContainer>
  );

  if (documentID) {
    // Optionally hide the list if the viewport is too small
    list = <Hidden mdDown>{list}</Hidden>;
  }

  let content = undefined;
  if (documentID) {
    content = <Document key={documentID} />;
  }

  let guideModal = (
    <DocumentFromGuideModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
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
    <Search search={searchConfig}>
      <Grid container className="fullHeight" style={{ position: "relative" }}>
        {list}
        {content}
        {guideModal}
      </Grid>
    </Search>
  );
}
