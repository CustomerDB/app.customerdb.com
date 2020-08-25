import React, { useContext, useEffect, useState } from "react";

import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function TagGroupSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);

  const {
    documentRef,
    tagGroupsRef,
    highlightsRef,
    deltasRef,
  } = useFirestore();

  const [doc, setDoc] = useState();
  const [tagGroups, setTagGroups] = useState();

  const doNothing = () => {};

  const onChange = props.onChange || doNothing;

  // Subscribe to document
  useEffect(() => {
    if (!documentRef) {
      return;
    }
    return documentRef.onSnapshot((snapshot) => {
      console.log("document snapshot", snapshot.data());
      setDoc(snapshot.data());
    });
  }, [documentRef]);

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
    console.log("onTagGroupChange", e);
    event("change_data_tag_group", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTagGroupID = e.target.value;

    if (newTagGroupID !== doc.tagGroupID) {
      // Confirm this change if the the set of highlights is not empty.

      return highlightsRef.get().then((highlightsSnap) => {
        let numHighlights = highlightsSnap.size;

        // TODO: use a modal for this instead
        if (numHighlights > 0) {
          console.debug("TODO: use a modal for this instead");
          let proceed = window.confirm(
            `This operation will delete ${numHighlights} highlights.\nAre you sure you want to change tag groups?`
          );

          if (!proceed) {
            console.debug("user declined to proceeed changing tag group");
            e.target.value = doc.tagGroupID;
            return;
          }

          // Remove the highlight formats from the existing text.
          let maxHighlightIndex = 0;
          highlightsSnap.forEach((doc) => {
            let hData = doc.data();
            let endIndex = hData.selection.index + hData.selection.length;
            maxHighlightIndex = Math.max(maxHighlightIndex, endIndex);
          });

          let deltaDoc = {
            editorID: "",
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: oauthClaims.email,
            ops: [
              {
                retain: maxHighlightIndex,
                attributes: {
                  highlight: null,
                },
              },
            ],
          };

          console.debug(
            "uploading delta to remove all highlight formats",
            deltaDoc
          );

          deltasRef
            .doc()
            .set(deltaDoc)
            .then(() => {
              highlightsSnap.forEach((doc) => {
                console.debug("deleting highlight", doc.id);
                highlightsRef.doc(doc.id).delete();
              });
            });
        }

        return documentRef
          .set(
            {
              tagGroupID: newTagGroupID,
            },
            { merge: true }
          )
          .then(onChange);
      });
    }
  };

  if (!tagGroups || !doc) {
    return <></>;
  }

  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel id="tag-group-select-label">Tag group</InputLabel>
      <Select
        labelId="tag-group-select-label"
        id="tag-group-select"
        onChange={onTagGroupChange}
        value={doc.tagGroupID}
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
