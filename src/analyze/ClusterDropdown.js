import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import useFirestore from "../db/Firestore.js";

export default function ClusterTabs(props) {
  const { orgID, tabID, tagID, analysisID } = useParams();
  const { allTagsRef } = useFirestore();
  const [allTagsList, setAllTagsList] = useState();
  const [allTagsMap, setAllTagsMap] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!allTagsRef) {
      return;
    }

    if (
      !props.analysis ||
      !props.analysis.tagGroupIDs ||
      props.analysis.tagGroupIDs.length === 0
    ) {
      return;
    }

    return allTagsRef
      .where("deletionTimestamp", "==", "")
      .where("organizationID", "==", orgID)
      .where("tagGroupID", "in", props.analysis.tagGroupIDs)
      .onSnapshot((snapshot) => {
        let newTagsList = [];
        let newTagsMap = {};
        snapshot.forEach((doc) => {
          let tagData = doc.data();
          newTagsList.push(tagData);
          newTagsMap[doc.id] = tagData;
        });
        setAllTagsList(newTagsList);
        setAllTagsMap(newTagsMap);
      });
  }, [orgID, allTagsRef, props.analysis, props.analysis.tagGroupIDs]);

  if (
    !props.analysis ||
    !props.analysis.tagGroupIDs ||
    props.analysis.tagGroupIDs.length === 0 ||
    !allTagsMap
  ) {
    return <></>;
  }

  if (!tagID) {
    if (allTagsList.length > 0) {
      navigate(
        `/orgs/${orgID}/analyze/${analysisID}/${tabID}/${allTagsList[0].ID}`
      );
    }
  }

  const onTagChange = (e) => {
    e.persist();
    let newTagID = e.target.value;
    navigate(`/orgs/${orgID}/analyze/${analysisID}/${tabID}/${newTagID}`);
  };

  return (
    <Grid container item style={{ maxWidth: "25rem" }}>
      {allTagsList && allTagsList.length > 0 && (
        <>
          <FormControl>
            <InputLabel id="tag-select-label">Tag</InputLabel>
            <Select
              labelId="tag-select-label"
              id="tag-group-select"
              onChange={onTagChange}
              value={tagID}
            >
              {allTagsList.map((option, index) => (
                <MenuItem
                  value={option.ID}
                  onClick={(event) => {
                    navigate(
                      `/orgs/${orgID}/analyze/${analysisID}/${tabID}/${option.ID}`
                    );
                  }}
                >
                  {option.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}
    </Grid>
  );
}
