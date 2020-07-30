import React, { useContext, useState, useEffect } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext.js";

import { useParams, useNavigate } from "react-router-dom";

import Button from "react-bootstrap/Button";

import Modal from "../shell/Modal.js";

export default function DatasetDeleteModal(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [dataset, setDataset] = useState();

  useEffect(() => {
    if (!props.datasetRef) {
      return;
    }

    props.datasetRef.get().then((doc) => {
      let dataset = doc.data();
      dataset.ID = doc.id;
      setDataset(dataset);
    });
  }, [props.show, props.datasetRef]);

  if (!dataset) {
    return <></>;
  }

  return (
    <Modal
      key={dataset.ID}
      name="Delete dataset"
      show={props.show}
      onHide={props.onHide}
      footer={[
        <Button
          key={dataset.ID}
          onClick={() => {
            event("delete_dataset", {
              orgID: oauthClaims.orgID,
              userID: oauthClaims.user_id,
            });

            props.datasetRef.set(
              {
                deletedBy: oauthClaims.email,
                deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            navigate(`/orgs/${orgID}/explore`);
          }}
        >
          Delete
        </Button>,
      ]}
    >
      <p>Do you want to delete {dataset.name}</p>
    </Modal>
  );
}
