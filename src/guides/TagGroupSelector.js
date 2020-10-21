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

export default function TagGroupSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { guideID } = useParams();

  const { templatesRef, tagGroupsRef } = useFirestore();

  const [templateRef, setTemplateRef] = useState();
  const [template, setTemplate] = useState();
  const [tagGroups, setTagGroups] = useState();

  const doNothing = () => {};
  const onChange = props.onChange || doNothing;

  // Build templateRef
  useEffect(() => {
    if (!templatesRef || !guideID) {
      setTemplateRef();
      return;
    }
    setTemplateRef(templatesRef.doc(guideID));
  }, [templatesRef, guideID]);

  // Subscribe to template
  useEffect(() => {
    if (!templateRef) return;

    return templateRef.onSnapshot((snapshot) => {
      console.log("template snapshot", snapshot.data());
      setTemplate(snapshot.data());
    });
  }, [templateRef]);

  // Subscribe to all tag groups to populate tag group selector
  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }
    return tagGroupsRef
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let tagGroups = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          tagGroups.push(data);
        });

        setTagGroups(tagGroups);
      });
  }, [tagGroupsRef]);

  const onTagGroupChange = (e) => {
    if (!templateRef || !template) return;

    event(firebase, "change_guide_tag_group", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTagGroupID = e.target.value;

    if (newTagGroupID !== template.tagGroupID) {
      return templateRef
        .update({
          tagGroupID: newTagGroupID,
        })
        .then(onChange);
    }
  };

  if (!tagGroups || !template) {
    return <></>;
  }

  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel id="tag-group-select-label">Tag group</InputLabel>
      <Select
        labelId="tag-group-select-label"
        id="tag-group-select"
        onChange={onTagGroupChange}
        value={template.tagGroupID}
      >
        <MenuItem value="">None</MenuItem>
        {tagGroups &&
          tagGroups.map((group) => (
            <MenuItem value={group.ID}>{group.name}</MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}
