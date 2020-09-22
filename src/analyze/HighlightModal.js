import { Link, useParams } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import React from "react";

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
          <Link to={`/orgs/${orgID}/interviews/${props.data.card.documentID}`}>
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
