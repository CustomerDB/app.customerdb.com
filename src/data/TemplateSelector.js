import React, { useContext, useEffect, useState } from "react";

import Delta from "quill-delta";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { initialDelta } from "./delta.js";
import useFirestore from "../db/Firestore.js";

export default function TemplateSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const [doc, setDoc] = useState();
  const [templates, setTemplates] = useState();

  const { documentRef, templatesRef } = useFirestore();

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
        props.editor.setContents(initialDelta(), "user");
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
                props.editor.setContents(new Delta(data.delta.ops), "user");
              });
          });
        });
    }
  };

  if (!doc || !templates || !props.editor) {
    return <></>;
  }

  return (
    <FormControl fullWidth>
      <InputLabel id="tag-group-select-label">Tag group</InputLabel>
      <Select
        labelId="tag-group-select-label"
        id="tag-group-select"
        onChange={onTemplateChange}
        value={doc.templateID}
      >
        <MenuItem value="">None</MenuItem>
        {templates &&
          templates.map((template) => {
            return <MenuItem value={template.ID}>{template.name}</MenuItem>;
          })}
      </Select>
    </FormControl>
  );
}
