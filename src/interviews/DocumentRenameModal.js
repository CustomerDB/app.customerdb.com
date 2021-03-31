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

import React, { useEffect, useState } from "react";

import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "../shell_obsolete/Modal.js";
import Row from "react-bootstrap/Row";

export default function DocumentRenameModal(props) {
  const [doc, setDoc] = useState();
  const [name, setName] = useState();

  useEffect(() => {
    if (!props.documentRef) return;

    props.documentRef.get().then((snap) => {
      let data = snap.data();
      data.ID = snap.id;
      setName(data.name);
      setDoc(data);
    });
  }, [props.show, props.documentRef]);

  if (!doc) {
    return <></>;
  }

  let fields = [
    {
      label: "Document name",
      placeholder: "Name",
      type: "text",
      value: name,
      setter: setName,
    },
  ];

  const onSave = () => {
    props.documentRef.update({
      name: name,
      needsIndex: true,
    });
    props.onHide();
  };

  let formControls = fields.map((field) => (
    <Row key={field.label} className="mb-3">
      <Col>
        <Form.Control
          type={field.type}
          placeholder={field.placeholder}
          value={field.value}
          onChange={(e) => {
            field.setter(e.target.value);
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") onSave();
          }}
        />
      </Col>
    </Row>
  ));

  return (
    <Modal
      show={props.show}
      onHide={props.onHide}
      name="Document name"
      footer={[
        <Button key="save" onClick={onSave}>
          Save
        </Button>,
      ]}
    >
      {formControls}
    </Modal>
  );
}
