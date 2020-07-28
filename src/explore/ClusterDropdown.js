import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useNavigate, useParams } from "react-router-dom";

import DropdownButton from "react-bootstrap/DropdownButton";
import Dropdown from "react-bootstrap/Dropdown";

export default function ClusterDropdown(props) {
  const { orgID, tabID, tagID } = useParams();
  const { allTagsRef } = useFirestore();
  const defaultButtonTitle = "Cluster";
  const [buttonTitle, setButtonTitle] = useState(defaultButtonTitle);

  useEffect(() => {
    if (!tagID) {
      setButtonTitle(defaultButtonTitle);
      return;
    }

    if (!allTagsRef) {
      return;
    }

    return allTagsRef
      .where("organizationID", "==", orgID)
      .where("ID", "==", tagID)
      .onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
          let tagData = doc.data();
          setButtonTitle(tagData.name);
        });
      });
  }, [orgID, tagID, allTagsRef]);

  if (
    !props.dataset ||
    !props.dataset.tagGroupIDs ||
    props.dataset.tagGroupIDs.length === 0
  ) {
    return <></>;
  }

  return (
    <DropdownButton
      style={{ minWidth: "8rem" }}
      title={buttonTitle}
      variant={tabID === "cluster" ? "primary" : "link"}
      drop="down"
    >
      {props.dataset.tagGroupIDs.map((tagGroupID) => (
        <ItemsForTagGroup key={tagGroupID} tagGroupID={tagGroupID} />
      ))}
    </DropdownButton>
  );
}

function ItemsForTagGroup(props) {
  const { orgID, datasetID } = useParams();
  const navigate = useNavigate();

  let tags = useTagGroup(props.tagGroupID);

  return Object.values(tags).map((tag) => (
    <Dropdown.Item
      key={tag.ID}
      onClick={() => {
        navigate(`/orgs/${orgID}/explore/${datasetID}/cluster/${tag.ID}`);
      }}
    >
      {tag.name}
    </Dropdown.Item>
  ));
}

function useTagGroup(tagGroupID) {
  const [tags, setTags] = useState({});
  const { tagGroupsRef } = useFirestore();

  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }

    setTags({});

    return tagGroupsRef
      .doc(tagGroupID)
      .collection("tags")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((tagDoc) => {
          let tagData = tagDoc.data();
          newTags[tagDoc.id] = {
            ID: tagDoc.id,
            name: tagData.name,
          };
        });
        setTags(newTags);
      });
  }, [tagGroupID, tagGroupsRef]);

  return tags;
}
