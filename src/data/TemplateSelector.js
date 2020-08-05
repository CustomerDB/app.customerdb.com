import React, { useContext, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";
import event from "../analytics/event.js";

import { initialDelta } from "./delta.js";

import Delta from "quill-delta";

import Form from "react-bootstrap/Form";

export default function TagGroupSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const [doc, setDoc] = useState();
  const [templates, setTemplates] = useState();
  const [editor, setEditor] = useState();

  const { documentRef, templatesRef } = useFirestore();

  const doNothing = () => {};

  const onChange = props.onChange || doNothing;

  useEffect(() => {
    if (!props.reactQuillRef.current) {
      return;
    }
    setEditor(props.reactQuillRef.current.getEditor());
  }, [props.reactQuillRef.current]);

  useEffect(() => {
    if (!documentRef) {
      return;
    }
    documentRef.onSnapshot((doc) => {
      setDoc(doc.data());
    });
  }, [documentRef]);

  useEffect(() => {
    if (!templatesRef) {
      return;
    }
    templatesRef
      .where("deletionTimestamp", "==", "")
      .orderBy("name", "asc")
      .onSnapshot((snapshot) => {
        let newTemplates = [];
        snapshot.forEach((doc) => {
          newTemplates.push(doc.data());
        });
        setTemplates(newTemplates);
      });
  }, [templatesRef]);

  const onTemplateChange = (e) => {
    console.log("onTagGroupChange", e);
    event("change_data_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTemplateID = e.target.value;

    // Handle setting the template to `None`.
    if (newTemplateID === "") {
      return documentRef.set({ templateID: "" }, { merge: true }).then(() => {
        editor.setContents(initialDelta(), "user");
      });
    }

    if (newTemplateID !== doc.templateID) {
      return templatesRef
        .doc(newTemplateID)
        .collection("snapshots")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get()
        .then((snapshot) => {
          snapshot.forEach((doc) => {
            let data = doc.data();
            return documentRef
              .set({ templateID: newTemplateID }, { merge: true })
              .then(() => {
                editor.setContents(new Delta(data.delta.ops), "user");
              });
          });
        });
    }
  };

  if (!doc || !templates || !editor) {
    return <></>;
  }

  return (
    <Form.Control
      as="select"
      onChange={onTemplateChange}
      value={doc.templateID}
    >
      <option key="none" value="">
        None
      </option>
      {templates &&
        templates.map((template) => {
          return (
            <option key={template.ID} value={template.ID}>
              {template.name}
            </option>
          );
        })}
    </Form.Control>
  );
}
