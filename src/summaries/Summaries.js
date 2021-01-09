import React, { useEffect, useState } from "react";

import { Search } from "../shell/Search.js";
import useFirestore from "../db/Firestore.js";
import Scrollable from "../shell/Scrollable.js";
import SummariesHelp from "./SummariesHelp.js";

import Avatar from "@material-ui/core/Avatar";
import AssignmentIcon from "@material-ui/icons/Assignment";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import { useNavigate, useParams } from "react-router-dom";

export default function Summaries({ create }) {
  // hooks
  const { summariesRef } = useFirestore();
  const navigate = useNavigate();
  const { orgID } = useParams();

  // state
  const [summaries, setSummaries] = useState([]);
  const [showResults, setShowResults] = useState();

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

  // TODO(CD): handle "create" endpoint
  useEffect(() => {}, [create]);

  const listItems = summaries.map((s) =>
    listItem(s.ID, s.name, s.creationTimestamp && s.creationTimestamp.toDate())
  );

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX,
      setShowResults: (value) => {
        setShowResults(value);
      },
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
