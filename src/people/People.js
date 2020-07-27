import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Infinite from "../shell/Infinite.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";

import PersonEditModal from "./PersonEditModal.js";
import PersonDeleteModal from "./PersonDeleteModal.js";
import Person from "./Person.js";

import { useParams, useNavigate } from "react-router-dom";

import { Loading } from "../util/Utils.js";

const batchSize = 25;

export default function People(props) {
  const auth = useContext(UserAuthContext);

  const { peopleRef } = useFirestore();

  const navigate = useNavigate();

  const { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState();
  const [peopleMap, setPeopleMap] = useState();
  const [addModalShow, setAddModalShow] = useState();
  const [newPersonRef, setNewPersonRef] = useState();
  const [listLimit, setListLimit] = useState(batchSize);
  const [listTotal, setListTotal] = useState();

  useEffect(() => {
    let unsubscribe = peopleRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newPeopleList = [];
        let newPeopleMap = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newPeopleList.push(data);
          newPeopleMap[data.ID] = data;
        });

        setPeopleList(newPeopleList);
        setPeopleMap(newPeopleMap);
        setListTotal(snapshot.size);
      });
    return unsubscribe;
  }, []);

  if (!peopleList || !peopleMap) {
    return <Loading />;
  }

  if (personID && !(personID in peopleMap)) {
    navigate("/404");
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

  let content =
    personID && peopleMap[personID] ? (
      <Person key={personID} person={peopleMap[personID]} options={options} />
    ) : (
      <></>
    );

  let addModal = (
    <PersonEditModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      personRef={newPersonRef}
    />
  );

  return (
    <Page>
      <List>
        <List.Search
          index="prod_PEOPLE"
          path={(ID) => `/orgs/${orgID}/people/${ID}`}
        >
          <List.SearchBox placeholder="Search in people..." />
          <List.Title>
            <List.Name>People</List.Name>
            <List.Add
              onClick={() => {
                peopleRef
                  .add({
                    name: "Unnamed person",
                    createdBy: auth.oauthClaims.email,
                    creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                    deletionTimestamp: "",
                  })
                  .then((doc) => {
                    setNewPersonRef(doc);
                    setAddModalShow(true);
                  });
              }}
            />
            {addModal}
          </List.Title>
          <List.Items>
            <Scrollable>
              <Infinite
                hasMore={() => {
                  if (!listTotal) {
                    return true;
                  }

                  return listTotal < listLimit;
                }}
                onLoad={() => setListLimit(listLimit + batchSize)}
              >
                {peopleList.slice(0, listLimit).map((person) => (
                  <List.Item
                    key={person.ID}
                    name={person.name}
                    path={`/orgs/${orgID}/people/${person.ID}`}
                    options={options(person.ID)}
                  />
                ))}
              </Infinite>
            </Scrollable>
          </List.Items>
        </List.Search>
      </List>
      {content}
    </Page>
  );
}
