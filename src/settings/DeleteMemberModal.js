import React, { useEffect, useState } from "react";

import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

export default function DeleteMemberModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.member !== undefined) {
      setName(props.member.displayName);
    }
  }, [props.member]);

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete member</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to delete{" "}
        <b>{name !== undefined ? name : "member"}</b>?
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={() => {
            props.onDelete(props.member.email);
            props.onHide();
          }}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
