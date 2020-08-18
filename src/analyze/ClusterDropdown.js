import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useNavigate, useParams } from "react-router-dom";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import MenuItem from "@material-ui/core/MenuItem";
import Menu from "@material-ui/core/Menu";
import Typography from "@material-ui/core/Typography";

export default function ClusterTabs(props) {
  const { orgID, tabID, tagID, analysisID } = useParams();
  const { allTagsRef } = useFirestore();
  const [allTagsList, setAllTagsList] = useState();
  const [allTagsMap, setAllTagsMap] = useState();
  const [anchorEl, setAnchorEl] = useState(null);

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

  const handleClickListItem = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      {allTagsList && allTagsList.length > 0 && (
        <>
          <List component="nav" aria-label="Device settings">
            <ListItem
              button
              aria-haspopup="true"
              aria-controls="lock-menu"
              aria-label="Select tag"
              onClick={handleClickListItem}
            >
              {tagID ? (
                <Typography gutterBottom variant="h4" component="h2">
                  {allTagsMap[tagID].name}
                </Typography>
              ) : (
                <p>
                  <i>
                    Select a tag to start forming clusters of customer quotes
                  </i>
                </p>
              )}
              {/* <ListItemText primary=> */}
            </ListItem>
          </List>
          <Menu
            id="tag-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {allTagsList.map((option, index) => (
              <MenuItem
                key={option.ID}
                selected={option.ID === tagID}
                onClick={(event) => {
                  navigate(
                    `/orgs/${orgID}/analyze/${analysisID}/${tabID}/${option.ID}`
                  );
                }}
              >
                {option.name}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </>
  );
}
