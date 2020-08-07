import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";
import TagGroupSelector from "./TagGroupSelector.js";
import TemplateSelector from "./TemplateSelector.js";
import Modal from "../shell/Modal.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

export default function DocumentCreateModal(props) {
  const [doc, setDoc] = useState();
  const [name, setName] = useState();
  const { documentRef } = useFirestore();

  console.log("document create modal :: render", props);

  useEffect(() => {
    if (!documentRef) return;

    documentRef.get().then((snapshot) => {
      let data = snapshot.data();
      data.ID = snapshot.id;
      setName(data.name);
      setDoc(data);
    });
  }, [props.show, documentRef]);

  if (!doc) {
    return <></>;
  }

  const onSave = () => {
    documentRef.set({ name: name }, { merge: true });
    props.onHide();
  };

  return (
    <Modal
      show={props.show}
      onHide={props.onHide}
      name="New document"
      footer={[
        <Button key="save" onClick={onSave}>
          Save
        </Button>,
      ]}
    >
      <Row key="name" className="mb-3">
        <Col>
          <p>
            <b>Document name</b>
          </p>
          <Form.Control
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter") onSave();
            }}
          />
        </Col>
      </Row>
      <Row key="tagGroup" className="mb-3">
        <Col>
          <p>
            <b>Tag group</b>
          </p>
          <TagGroupSelector />
        </Col>
      </Row>
      <Row key="template" className="mb-3">
        <Col>
          <p>
            <b>Template</b>
          </p>
          <TemplateSelector editor={props.editor} />
        </Col>
      </Row>
    </Modal>
  );
}
