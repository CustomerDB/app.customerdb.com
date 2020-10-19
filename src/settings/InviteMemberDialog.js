import React, { useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";

export default function InviteMemberDialog(props) {
  const [email, setEmail] = useState();

  const onSubmit = () => {
    props.onInvite(email);
    setEmail("");
    props.onHide();
  };

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Invite new team member</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Label>
          Email address of new team member. An invite will be sent by email with
          a link or they can join the organization here.
        </Form.Label>
        <Form.Control
          type="email"
          defaultValue={email}
          placeholder="Email"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onSubmit}>
          Add account
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
