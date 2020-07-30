import React, { useContext, useState, useEffect } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext.js";

import { useParams, useNavigate } from "react-router-dom";

import Button from "react-bootstrap/Button";

import Modal from "../shell/Modal.js";

export default function PersonDeleteModal(props) {
  const { oauthClaims } = useContext(UserAuthContext);
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
            event("delete_person", {
              orgID: oauthClaims.orgID,
              userID: oauthClaims.user_id,
            });
            props.personRef.set(
              {
                deletedBy: oauthClaims.email,
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
      <p>
        Do you want to delete <b>{person.name}</b>?
      </p>
    </Modal>
  );
}
