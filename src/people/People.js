import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";
import event from "../analytics/event.js";

import { connectHits } from "react-instantsearch-dom";

import Avatar from "react-avatar";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import AddIcon from "@material-ui/icons/Add";
import Fab from "@material-ui/core/Fab";
import Grid from "@material-ui/core/Grid";

import Shell from "../shell/Shell.js";
import ListContainer from "../shell/ListContainer";

import Infinite from "../shell/Infinite.js";
import Scrollable from "../shell/Scrollable.js";

import PersonEditModal from "./PersonEditModal.js";
import Person from "./Person.js";

import PeopleHelp from "./PeopleHelp.js";
import PersonHelp from "./PersonHelp.js";

import Hidden from "@material-ui/core/Hidden";

import { useParams, useNavigate } from "react-router-dom";

const batchSize = 25;

export default function People(props) {
  const { oauthClaims } = useContext(UserAuthContext);

  const { peopleRef } = useFirestore();

  const navigate = useNavigate();

  const { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState([]);
  const [addModalShow, setAddModalShow] = useState();
  const [newPersonRef, setNewPersonRef] = useState();
  const [listLimit, setListLimit] = useState(batchSize);
  const [listTotal, setListTotal] = useState();
  const [showResults, setShowResults] = useState();

  useEffect(() => {
    if (!peopleRef) {
      return;
    }

    let unsubscribe = peopleRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newPeopleList = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newPeopleList.push(data);
        });

        setPeopleList(newPeopleList);
        setListTotal(snapshot.size);
      });
    return unsubscribe;
  }, [peopleRef]);

  let content;
  if (personID) {
    content = <Person key={personID} />;
  } else if (listTotal > 0) {
    content = <PersonHelp />;
  }

  let addModal = (
    <PersonEditModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      personRef={newPersonRef}
    />
  );

  const personListItem = (ID, name, company) => (
    <ListItem
      button
      key={ID}
      selected={ID === personID}
      onClick={() => {
        navigate(`/orgs/${orgID}/people/${ID}`);
      }}
    >
      <ListItemAvatar>
        <Avatar size={50} name={name} round={true} />
      </ListItemAvatar>
      <ListItemText primary={name} secondary={company} />
    </ListItem>
  );

  const SearchResults = connectHits((result) => {
    return result.hits.map((hit) =>
      personListItem(hit.objectID, hit.name, hit.company)
    );
  });

  let list = (
    <ListContainer>
      <Scrollable>
        {showResults ? (
          <SearchResults />
        ) : (
          <List>
            {listTotal > 0 ? (
              <Infinite
                hasMore={() => {
                  if (!listTotal) {
                    return true;
                  }

                  return listTotal < listLimit;
                }}
                onLoad={() => setListLimit(listLimit + batchSize)}
              >
                {peopleList
                  .slice(0, listLimit)
                  .map((person) =>
                    personListItem(person.ID, person.name, person.company)
                  )}
              </Infinite>
            ) : (
              <PeopleHelp />
            )}
          </List>
        )}
      </Scrollable>
      <Fab
        style={{ position: "absolute", bottom: "15px", right: "15px" }}
        color="secondary"
        aria-label="add"
        onClick={() => {
          event("create_person", {
            orgID: oauthClaims.orgID,
            userID: oauthClaims.user_id,
          });
          peopleRef
            .add({
              name: "Unnamed person",
              createdBy: oauthClaims.email,
              creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
              deletionTimestamp: "",
            })
            .then((doc) => {
              navigate(`/orgs/${orgID}/people/${doc.id}`);
              setNewPersonRef(doc);
              setAddModalShow(true);
            });
        }}
      >
        <AddIcon />
      </Fab>
    </ListContainer>
  );

  if (personID) {
    // Optionally hide the list if the viewport is too small
    list = <Hidden mdDown>{list}</Hidden>;
  }

  return (
    <Shell
      title="Customers"
      search={{
        index: process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX,
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
