import React, { useContext, useEffect, useState } from "react";

import Delta from "quill-delta";
import FirebaseContext from "../util/FirebaseContext.js";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { initialDelta } from "../editor/delta.js";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";

export default function TemplateSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const [doc, setDoc] = useState();
  const [templates, setTemplates] = useState();
  const { defaultTagGroupID } = useOrganization();

  const { documentRef, templatesRef } = useFirestore();

  useEffect(() => {
    if (!documentRef) {
      return;
    }
    return documentRef.onSnapshot((doc) => {
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
    let editor;
    if (!props.reactQuillNotesRef || !props.reactQuillNotesRef.current) {
      return;
    }
    editor = props.reactQuillNotesRef.current.getEditor();

    console.log("onTagGroupChange", e);
    event(firebase, "change_interview_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTemplateID = e.target.value;

    // Handle setting the template to `None`.
    if (newTemplateID === "") {
      return documentRef
        .update({
          templateID: "",
          tagGroupID: defaultTagGroupID,
        })
        .then(() => {
          editor.setContents(initialDelta(), "user");
        });
    }

    if (newTemplateID !== doc.templateID) {
      return templatesRef
        .doc(newTemplateID)
        .get()
        .then((templateDoc) => {
          let template = templateDoc.data();

          return templatesRef
            .doc(newTemplateID)
            .collection("snapshots")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get()
            .then((snapshot) => {
              if (snapshot.size === 0) return;

              let templateSnapshot = snapshot.docs[0].data();
              return documentRef
                .update({
                  templateID: newTemplateID,
                  tagGroupID: template.tagGroupID || defaultTagGroupID,
                })
                .then(() => {
                  editor.setContents(
                    new Delta(templateSnapshot.delta.ops),
                    "user"
                  );
                });
            });
        });
    }
  };

  if (!doc || !templates) {
    return <></>;
  }

  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel id="template-select-label">Guide</InputLabel>
      <Select
        labelId="template-select-label"
        id="template-select"
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
