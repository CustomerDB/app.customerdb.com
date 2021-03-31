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

import { useEffect, useState, useRef } from "react";

import useFirestore from "../db/Firestore.js";

export function useOrganization() {
  const { orgRef } = useFirestore();
  const [org, setOrg] = useState({});

  useEffect(() => {
    if (!orgRef) return;
    return orgRef.onSnapshot((doc) => {
      if (doc.exists) setOrg(doc.data());
    });
  }, [orgRef]);

  return org;
}

// Returns a structure with the following format:
//
// {
//   <tagGroupID>: {
//     name,
//     tags: {
//       <tagID>: {
//         name,
//         color,
//         textColor,
//       },
//       ...
//     }
//   },
//   ...
// }
export function useOrgTags() {
  const { orgRef } = useFirestore();
  const [tagGroups, setTagGroups] = useState();
  const [tags, setTags] = useState();
  const tagsCache = useRef({});

  useEffect(() => {
    if (!orgRef) return;

    return orgRef
      .collection("tagGroups")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        const newTagGroups = {};
        snapshot.docs.forEach((doc) => {
          const group = doc.data();
          group.ID = doc.id;
          group.tags = {};
          newTagGroups[doc.id] = group;
        });
        setTagGroups(newTagGroups);
      });
  }, [orgRef]);

  useEffect(() => {
    if (!tagGroups) return;

    const unsubscribeFuncs = Object.values(tagGroups).map((tagGroup) => {
      return orgRef
        .collection("tagGroups")
        .doc(tagGroup.ID)
        .collection("tags")
        .where("deletionTimestamp", "==", "")
        .onSnapshot((snapshot) => {
          const newTags = {};
          newTags[tagGroup.ID] = tagGroup;

          snapshot.docs.forEach((doc) => {
            newTags[tagGroup.ID].tags[doc.id] = doc.data();
          });

          const updatedTags = Object.assign({}, tagsCache.current);
          Object.assign(updatedTags, newTags);
          tagsCache.current = updatedTags;
          setTags(updatedTags);
        });
    });
    return () => {
      unsubscribeFuncs.forEach((f) => f());
    };
  }, [orgRef, tagsCache, tagGroups]);

  return tags;
}
