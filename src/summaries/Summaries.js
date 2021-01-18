import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import { Search } from "../shell/Search.js";
import FirebaseContext from "../util/FirebaseContext.js";
import useFirestore from "../db/Firestore.js";
import Scrollable from "../shell/Scrollable.js";
import SummariesHelp from "./SummariesHelp.js";
import UserAuthContext from "../auth/UserAuthContext.js";

import Avatar from "@material-ui/core/Avatar";
import AssignmentIcon from "@material-ui/icons/Assignment";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import short from "short-uuid";
import { initialDelta } from "../editor/delta.js";
import { useNavigate, useParams } from "react-router-dom";
import EmptyStateHelp from "../util/EmptyStateHelp.js";

export default function Summaries({ create }) {
  // hooks
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { summariesRef } = useFirestore();
  const navigate = useNavigate();
  const { orgID } = useParams();

  // state
  const [summaries, setSummaries] = useState();

  // subscribe to summaries collection
  useEffect(() => {
    if (!summariesRef) return;

    return summariesRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        setSummaries(
          snapshot.docs.map((doc) => {
            let summary = doc.data();
            summary.ID = doc.id;
            return summary;
          })
        );
      });
  }, [summariesRef]);

  const listItem = (ID, name, date) => {
    return (
      <ListItem
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
        }}
        button
        key={ID}
        onClick={() => {
          navigate(`/orgs/${orgID}/summaries/${ID}`);
        }}
      >
        <ListItemAvatar>
          <Avatar>
            <AssignmentIcon />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={name}
          secondary={date && <Moment fromNow date={date} />}
        />
      </ListItem>
    );
  };

  // handle "create" endpoint
  useEffect(() => {
    if (
      !create ||
      !summariesRef ||
      !oauthClaims.user_id ||
      !oauthClaims.email
    ) {
      return;
    }

    event(firebase, "create_summary", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    const summaryID = short.generate();
    const summaryRef = summariesRef.doc(summaryID);

    summaryRef
      .set({
        ID: summaryID,
        name: "Untitled Summary",
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        needsIndex: false,
        deletionTimestamp: "",
      })
      .then(() => {
        summaryRef.collection("revisions").add({
          delta: { ops: initialDelta().ops },
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
      })
      .then(() => {
        navigate(`/orgs/${orgID}/summaries/${summaryID}`);
      });
  }, [create, summariesRef, firebase, navigate, oauthClaims, orgID]);

  if (!summaries) {
    return <></>;
  }

  if (summaries.length === 0) {
    return (
      <EmptyStateHelp
        title="Summaries and share your findings"
        description="You can synthesize your findings and pull in direct customer quotes and themes you have identified"
        buttonText="Create summary"
        path={`/orgs/${orgID}/summaries/create`}
      />
    );
  }

  const listItems = summaries.map((s) =>
    listItem(s.ID, s.name, s.creationTimestamp && s.creationTimestamp.toDate())
  );

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX,
    };
  }

  return (
    <Search search={searchConfig}>
      <Grid container className="fullHeight" style={{ position: "relative" }}>
        <ListContainer>
          <Scrollable>
            <List style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
              {listItems.length > 0 ? listItems : <SummariesHelp />}
            </List>
          </Scrollable>
        </ListContainer>
      </Grid>
    </Search>
  );
}
