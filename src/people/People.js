import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";

import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";
import Modal from "../shell/Modal.js";

import PersonEditModal from "./PersonEditModal.js";
import Person from "./Person.js";

import Button from "react-bootstrap/Button";

import { useParams, useNavigate } from "react-router-dom";

import { Loading } from "../Utils.js";

export default function People(props) {
  const auth = useContext(UserAuthContext);

  const navigate = useNavigate();

  const { personID, orgID } = useParams();

  const [peopleList, setPeopleList] = useState();
  const [peopleMap, setPeopleMap] = useState();
  const [addModalShow, setAddModalShow] = useState();
  const [newPersonRef, setNewPersonRef] = useState();

  const options = (person) => {
    let personRef = props.peopleRef.doc(person.ID);
    return (
      <Options>
        <Options.Item
          name="Edit"
          modal={<PersonEditModal personRef={personRef} />}
        />

        <Options.Item
          name="Delete"
          modal={
            <Modal
              name="Delete message"
              footer={[
                <Button
                  onClick={() => {
                    console.log(`Delete ${person.name} with ${person.ID}!`);
                    personRef.set(
                      {
                        deletedBy: auth.oauthClaims.email,
                        deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                      },
                      { merge: true }
                    );

                    navigate(`/orgs/${orgID}/people`);
                  }}
                >
                  Delete
                </Button>,
              ]}
            >
              <p>Do you want to delete {person.name}</p>
            </Modal>
          }
        />
      </Options>
    );
  };

  useEffect(() => {
    let unsubscribe = props.peopleRef
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
      });
    return unsubscribe;
  }, []);

  if (!peopleList || !peopleMap) {
    return <Loading />;
  }

  if (personID && !(personID in peopleMap)) {
    navigate("/404");
  }

  let peopleComponents = peopleList.map((person) => (
    <List.Item
      name={person.name}
      path={`/orgs/${orgID}/people/${person.ID}`}
      active={personID === person.ID}
      options={options(person)}
    />
  ));

  let content =
    personID && peopleMap[personID] ? (
      <Person person={peopleMap[personID]} options={options} />
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
          path={(ID) => `/org/${orgID}/people/${ID}`}
          options={(ID) => options(ID)}
        >
          <List.SearchBox placeholder="Search in documents..." />
          <List.Title>
            <List.Name>People</List.Name>
            <List.Add
              onClick={() => {
                props.peopleRef
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
            <Scrollable>{peopleComponents}</Scrollable>
          </List.Items>
        </List.Search>
      </List>
      <Content>{content}</Content>
    </Page>
  );
}
