import React, { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useParams } from "react-router-dom";

export default function TemplateSelector({ onChange, documentID }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const [doc, setDoc] = useState();
  const [templates, setTemplates] = useState();
  const [templateID, setTemplateID] = useState("");
  const { orgID } = useParams();
  const { documentsRef, templatesRef } = useFirestore();

  useEffect(() => {
    if (!documentsRef || !documentID) {
      return;
    }
    return documentsRef.doc(documentID).onSnapshot((doc) => {
      setDoc(doc.data());
    });
  }, [documentsRef, documentID]);

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
    event(firebase, "change_interview_template", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    const newTemplateID = e.target.value;
    const newTemplate = templates.find((t) => t.ID === newTemplateID);
    setTemplateID(newTemplateID);
    onChange(newTemplate);
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
        value={templateID}
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
