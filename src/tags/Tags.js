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
import { useNavigate, useParams } from "react-router-dom";

import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import TagGroup from "./TagGroup.js";
import Typography from "@material-ui/core/Typography";
import EmptyStateHelp from "../util/EmptyStateHelp.js";

export default function Tags({ create }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { tagGroupsRef } = useFirestore();
  const { orgID } = useParams();
  const [tagGroups, setTagGroups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }

    return tagGroupsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newTagGroups = [];

        snapshot.forEach((doc) => {
          let data = doc.data();

          data["ID"] = doc.id;
          newTagGroups.push(data);
        });

        setTagGroups(newTagGroups);
      });
  }, [tagGroupsRef]);

  useEffect(() => {
    if (!create || !tagGroupsRef || !oauthClaims) {
      return;
    }

    event(firebase, "create_tag_group", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    tagGroupsRef.add({
      name: "New tag set",
      createdBy: oauthClaims.email,
      creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: "",
    });

    navigate(`/orgs/${orgID}/tags`);
  }, [create, tagGroupsRef, firebase, navigate, oauthClaims, orgID]);

  if (!tagGroupsRef) {
    return <Loading />;
  }

  if (tagGroups.length === 0) {
    return (
      <EmptyStateHelp
        title="Categorize customer quotes"
        description="Tags are the first line of organization for important customer quotes. Set them up any way that makes sense to you and your team!"
        buttonText="Create tags"
        path={`/orgs/${orgID}/tags/create`}
      />
    );
  }

  return (
    <>
      <Typography
        variant="h6"
        style={{ fontWeight: "bold", padding: "1rem" }}
        component="h2"
      >
        Tags
      </Typography>
      <Grid container item xs={12} alignItems="baseline">
        {tagGroups && tagGroups.map((tg) => <TagGroup tagGroupID={tg.ID} />)}
      </Grid>
    </>
  );
}
