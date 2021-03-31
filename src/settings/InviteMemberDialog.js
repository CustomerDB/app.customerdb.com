// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
