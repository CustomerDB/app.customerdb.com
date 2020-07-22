import React, { useState, useEffect } from "react";

import Modal from "../shell/Modal.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

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
  }, [props.show]);

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
    props.documentRef.set({ name: name }, { merge: true });
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
