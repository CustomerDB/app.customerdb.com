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

import React, { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import FormControl from "@material-ui/core/FormControl";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useParams, useNavigate } from "react-router-dom";
import Divider from "@material-ui/core/Divider";

export default function TagGroupSelector(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const navigate = useNavigate();

  const {
    documentRef,
    tagGroupsRef,
    highlightsRef,
    transcriptHighlightsRef,
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
    event(firebase, "change_interview_tag_group", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTagGroupID = e.target.value;

    if (newTagGroupID === "ignore") {
      return;
    }

    const highlightsCount = (highlightsRefs) => {
      return Promise.all(
        highlightsRefs.map((highlightsRef) =>
          highlightsRef.get().then((snap) => snap.size)
        )
      ).then((values) => values.reduce((a, el) => a + el));
    };

    const removeHighlights = (deltasRef, highlightsRef) => {
      // Remove the highlight formats from the existing text.
      let maxHighlightIndex = 0;
      return highlightsRef.get().then((highlightsSnap) => {
        highlightsSnap.forEach((doc) => {
          let hData = doc.data();
          let endIndex = hData.selection.index + hData.selection.length;
          maxHighlightIndex = Math.max(maxHighlightIndex, endIndex);
        });

        if (maxHighlightIndex === 0) {
          return;
        }

        let deltaDoc = {
          editorID: "",
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
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

        return deltasRef
          .doc()
          .set(deltaDoc)
          .then(() => {
            return Promise.all(
              highlightsSnap.docs.map((doc) => {
                console.debug("deleting highlight", doc.id);
                return highlightsRef.doc(doc.id).delete();
              })
            );
          });
      });
    };

    if (newTagGroupID !== doc.tagGroupID) {
      let count = highlightsCount([highlightsRef, transcriptHighlightsRef]);
      count.then((totalHighlights) => {
        if (totalHighlights > 0) {
          let proceed = window.confirm(
            `This operation will delete ${totalHighlights} highlights.\nAre you sure you want to change tag groups?`
          );

          if (!proceed) {
            console.debug("user declined to proceeed changing tag group");
            e.target.value = doc.tagGroupID;
            return;
          }

          removeHighlights(
            documentRef.collection("deltas"),
            highlightsRef
          ).then(() => {
            return removeHighlights(
              documentRef.collection("transcriptDeltas"),
              transcriptHighlightsRef
            );
          });
        }

        return documentRef
          .update({
            tagGroupID: newTagGroupID,
          })
          .then(onChange);
      });
    }
  };

  if (!tagGroups || !doc) {
    return <></>;
  }

  return (
    <FormControl fullWidth>
      <Select
        labelId="tag-group-select-label"
        id="tag-group-select"
        onChange={onTagGroupChange}
        value={doc.tagGroupID}
      >
        {tagGroups &&
          tagGroups.map((group) => (
            <MenuItem key={group.ID} value={group.ID}>
              {group.name}
            </MenuItem>
          ))}
        <Divider />
        <MenuItem
          value="ignore"
          onClick={() => {
            navigate(`/orgs/${orgID}/tags`);
          }}
        >
          Manage tag groups
        </MenuItem>
      </Select>
    </FormControl>
  );
}
