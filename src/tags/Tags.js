import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";
import TagGroup from "./TagGroup.js";
import Typography from "@material-ui/core/Typography";

export default function Tags({ create }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { tagGroupsRef } = useFirestore();
  const { orgID } = useParams();
  const [tagGroups, setTagGroups] = useState([]);
  const navigate = useNavigate();

  const { defaultTagGroupID } = useOrganization();

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

  if (!tagGroupsRef || !defaultTagGroupID) {
    return <Loading />;
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
