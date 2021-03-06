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

import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Avatar from "react-avatar";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import Infinite from "../shell/Infinite.js";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Person from "./Person.js";
import Scrollable from "../shell/Scrollable.js";
import { Search } from "../shell/Search.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { connectHits } from "react-instantsearch-dom";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import EmptyStateHelp from "../util/EmptyStateHelp.js";

const batchSize = 25;

export default function People({ create, edit }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  const { peopleRef } = useFirestore();

  const navigate = useNavigate();

  const { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState([]);
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

  useEffect(() => {
    if (!create || !peopleRef || !oauthClaims.email || !oauthClaims.user_id) {
      return;
    }

    event(firebase, "create_person", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    peopleRef
      .add({
        name: "Unnamed person",
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then((doc) => {
        navigate(`/orgs/${orgID}/people/${doc.id}/edit`);
      });
  }, [create, peopleRef, firebase, navigate, oauthClaims, orgID]);

  let content;
  if (personID) {
    content = <Person edit={edit} key={personID} />;
  }

  const personListItem = (ID, name, imageURL, company) => (
    <ListItem
      button
      key={ID}
      selected={ID === personID}
      onClick={() => {
        navigate(`/orgs/${orgID}/people/${ID}`);
      }}
      style={{
        backgroundColor: "white",
        borderRadius: "0.5rem",
        marginBottom: "1rem",
      }}
    >
      <ListItemAvatar>
        <Avatar size={50} name={name} round={true} src={imageURL} />
      </ListItemAvatar>
      <ListItemText primary={name} secondary={company} />
    </ListItem>
  );

  const SearchResults = connectHits((result) => {
    return result.hits.map((hit) =>
      personListItem(hit.objectID, hit.name, hit.imageURL, hit.company)
    );
  });

  if (peopleList.length === 0) {
    return (
      <EmptyStateHelp
        title="Keep track of customers"
        description="Add customers and prospects here and start tracking themes across conversations."
        buttonText="Create customer"
        path={`/orgs/${orgID}/people/create`}
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
                  personListItem(
                    person.ID,
                    person.name,
                    person.imageURL,
                    person.company
                  )
                )}
            </Infinite>
          </List>
        )}
      </Scrollable>
    </ListContainer>
  );

  if (personID) {
    // Optionally hide the list if the viewport is too small
    list = <Hidden mdDown>{list}</Hidden>;
  }

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX,
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
      </Grid>
    </Search>
  );
}
