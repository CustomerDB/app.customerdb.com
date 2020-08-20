import React from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";

import { Link, useParams } from "react-router-dom";

export default function HighlightModal(props) {
  const { orgID } = useParams();

  if (props.data === undefined) {
    return <></>;
  }

  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          <Link to={`/orgs/${orgID}/data/${props.data.card.documentID}`}>
            <small>{props.data.document.name}</small>
          </Link>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{props.data.highlight.text}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
