import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import { useParams, useNavigate } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import Modal from "../shell/Modal.js";

export default function DatasetEditModal(props) {
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [dataset, setDataset] = useState();
  const [name, setName] = useState();

  useEffect(() => {
    if (!props.datasetRef) {
      return;
    }

    props.datasetRef.get().then((doc) => {
      let dataset = doc.data();
      dataset.ID = doc.id;
      setName(dataset.name);
      setDataset(dataset);
      console.log("Dataset loaded in modal");
    });
  }, [props.show]);

  console.log("DatasetEditModal", props);

  if (!dataset) {
    return <></>;
  }

  return (
    <Modal
      key={dataset.ID}
      name="Edit dataset"
      show={props.show}
      onHide={props.onHide}
      footer={[
        <Button
          key={dataset.ID}
          onClick={() => {
            props.datasetRef.set({ name: name }, { merge: true });

            navigate(`/orgs/${orgID}/explore/${dataset.ID}`);
          }}
        >
          Save
        </Button>,
      ]}
    >
      <Form.Label>Name</Form.Label>
      <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
    </Modal>
  );
}
