import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import { useParams, useNavigate } from "react-router-dom";

import Button from "react-bootstrap/Button";

import Modal from "../shell/Modal.js";

export default function PersonDeleteModal(props) {
  const auth = useContext(UserAuthContext);
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [person, setPerson] = useState();

  useEffect(() => {
    if (!props.personRef) {
      return;
    }

    props.personRef.get().then((doc) => {
      let person = doc.data();
      person.ID = doc.id;
      setPerson(person);
    });
  }, [props.show, props.personRef]);

  if (!person) {
    return <></>;
  }

  return (
    <Modal
      key={person.ID}
      name="Delete person"
      show={props.show}
      onHide={props.onHide}
      footer={[
        <Button
          key={person.ID}
          onClick={() => {
            props.personRef.set(
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
  );
}
