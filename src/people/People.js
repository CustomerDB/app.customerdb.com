import React, { useContext, useState, useEffect, useRef } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";
import event from "../analytics/event.js";

import { connectHits } from "react-instantsearch-dom";

import Avatar from "react-avatar";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";

import Shell from "../shell/Shell.js";
import { Search } from "../shell/Search.js";

import Page from "../shell_obsolete/Page.js";
import ObsoleteList from "../shell_obsolete/List.js";
import Infinite from "../shell_obsolete/Infinite.js";
import Scrollable from "../shell_obsolete/Scrollable.js";
import Options from "../shell_obsolete/Options.js";

import PersonEditModal from "./PersonEditModal.js";
import PersonDeleteModal from "./PersonDeleteModal.js";
import Person from "./Person.js";

import PeopleHelp from "./PeopleHelp.js";
import PersonHelp from "./PersonHelp.js";

import { useParams, useNavigate } from "react-router-dom";

import { Loading } from "../util/Utils.js";

const batchSize = 25;

export default function People(props) {
  const { oauthClaims } = useContext(UserAuthContext);

  const { peopleRef } = useFirestore();

  const navigate = useNavigate();

  const { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState();
  const [addModalShow, setAddModalShow] = useState();
  const [newPersonRef, setNewPersonRef] = useState();
  const [listLimit, setListLimit] = useState(batchSize);
  const [listTotal, setListTotal] = useState();
  const [showResults, setShowResults] = useState();

  let listRef = useRef();

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

  if (!peopleList) {
    return <Loading />;
  }

  const options = (personID) => {
    if (!personID) {
      return <></>;
    }

    let personRef = peopleRef.doc(personID);

    return (
      <Options key={personID}>
        <Options.Item
          name="Edit"
          modal={<PersonEditModal personRef={personRef} />}
        />

        <Options.Item
          name="Delete"
          modal={<PersonDeleteModal personRef={personRef} />}
        />
      </Options>
    );
  };

  let content;
  if (personID) {
    content = <Person key={personID} options={options} />;
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
      key={ID}
      selected={ID == personID}
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
      <Page>
        <ObsoleteList>
          <ObsoleteList.Items>
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
          </ObsoleteList.Items>
          {/* </ObsoleteList.Search> */}
        </ObsoleteList>
        {content}
      </Page>
    </Shell>
  );
}
