import React, { useContext, useEffect, useRef, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import Content from "../shell/Content.js";
import List from "../shell/List.js";
import Scrollable from "../shell/Scrollable.js";
import { Loading } from "../util/Utils.js";
import Form from "react-bootstrap/Form";
import Modal from "../shell/Modal.js";
import Options from "../shell/Options.js";
import { initialDelta } from "../data/delta.js";

import { nanoid } from "nanoid";
import { useParams, useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Row";
import ReactQuill from "react-quill";
import Delta from "quill-delta";

import "react-quill/dist/quill.bubble.css";

export default function Templates(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const [templates, setTemplates] = useState();
  const [template, setTemplate] = useState();
  const [templateSnapshot, setTemplateSnapshot] = useState();
  const { orgID, templateID } = useParams();
  const { templatesRef } = useFirestore();
  const reactQuillRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!templatesRef) {
      return;
    }
    return templatesRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newTemplates = [];
        snapshot.forEach((doc) => {
          newTemplates.push(doc.data());
        });
        setTemplates(newTemplates);
      });
  }, [templatesRef]);

  useEffect(() => {
    if (!templatesRef || !templateID) {
      return;
    }
    return templatesRef.doc(templateID).onSnapshot((doc) => {
      setTemplate(doc.data());
    });
  }, [templatesRef, templateID]);

  useEffect(() => {
    if (!templatesRef || !templateID) {
      return;
    }
    return templatesRef
      .doc(templateID)
      .collection("snapshots")
      .orderBy("timestamp", "desc")
      .limit(1)
      .onSnapshot((snapshot) => {
        console.log("received template snapshot update");
        snapshot.forEach((snapshotDoc) => {
          let data = snapshotDoc.data();
          let delta = new Delta(data.delta.ops);
          console.log("updating snapshot delta", delta);
          setTemplateSnapshot(delta);
        });
      });
  }, [templatesRef, templateID]);

  if (!templates) {
    return <Loading />;
  }

  const onAdd = () => {
    event("create_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let newTemplateID = nanoid();
    templatesRef
      .doc(newTemplateID)
      .set({
        ID: newTemplateID,
        name: "Untitled Template",
        createdBy: oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then(() => {
        return templatesRef
          .doc(newTemplateID)
          .collection("snapshots")
          .doc()
          .set({
            delta: { ops: initialDelta().ops },
            createdBy: oauthClaims.email,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          });
      })
      .then((newTemplateRef) => {
        navigate(`/orgs/${orgID}/settings/templates/${newTemplateID}`);
      });
  };

  const onSave = () => {
    event("edit_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let editor = reactQuillRef.current.getEditor();
    let currentDelta = editor.getContents();

    console.log("uploading new snapshot delta", currentDelta);

    return templatesRef
      .doc(templateID)
      .collection("snapshots")
      .doc()
      .set({
        delta: { ops: currentDelta.ops },
        createdBy: oauthClaims.email,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
  };

  let listItems = templates.map((template) => (
    <List.Item
      key={template.ID}
      name={template.name}
      path={`/orgs/${orgID}/settings/templates/${template.ID}`}
    />
  ));

  let options = template && (
    <Options key={template.ID}>
      <Options.Item
        name="Rename"
        modal={
          <Modal
            key="rename"
            name="Rename Template"
            show={props.show}
            onHide={props.onHide}
            footer={[
              <Button
                key={template.ID}
                onClick={() => {
                  event("rename_template", {
                    orgID: oauthClaims.orgID,
                    userID: oauthClaims.user_id,
                  });

                  let elem = document.getElementById("template-name");
                  let newName = elem.value;

                  templatesRef
                    .doc(template.ID)
                    .set({ name: newName }, { merge: true });
                }}
              >
                Rename
              </Button>,
            ]}
          >
            <Form.Control
              id="template-name"
              type="text"
              placeholder="Name"
              defaultValue={template.name}
            />
          </Modal>
        }
      />

      <Options.Item
        name="Delete"
        modal={
          <Modal
            key="delete"
            name="Delete template"
            show={props.show}
            onHide={props.onHide}
            footer={[
              <Button
                key={template.ID}
                variant="danger"
                onClick={() => {
                  event("delete_template", {
                    orgID: oauthClaims.orgID,
                    userID: oauthClaims.user_id,
                  });
                  templatesRef.doc(template.ID).set(
                    {
                      deletedBy: oauthClaims.email,
                      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );

                  navigate(`/orgs/${orgID}/settings/templates`);
                }}
              >
                Delete
              </Button>,
            ]}
          >
            <p>
              Do you want to delete <b>{template.name}</b>?
            </p>
          </Modal>
        }
      />
    </Options>
  );

  let content = template && templateSnapshot && (
    <Content className="quillBounds">
      <Content.Title>
        <Content.Name>{template.name}</Content.Name>
        <Content.Options>{options}</Content.Options>
      </Content.Title>
      <Button
        key="save"
        variant="primary"
        onClick={onSave}
        style={{ width: "6rem" }}
      >
        Save
      </Button>
      <ReactQuill
        ref={reactQuillRef}
        value={templateSnapshot}
        theme="bubble"
        bounds=".quillBounds"
        placeholder="Start typing here"
      />
    </Content>
  );

  return (
    <Row className="h-100 no-gutters">
      <List>
        <List.Title>
          <List.Name>Templates</List.Name>
          <List.Add onClick={onAdd} />
        </List.Title>
        <List.Items>
          <Scrollable>{listItems}</Scrollable>
        </List.Items>
      </List>
      {content}
    </Row>
  );
}
