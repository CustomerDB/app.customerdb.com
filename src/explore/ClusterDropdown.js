import React, { useEffect, useState } from "react";

import { Navigate, useNavigate, useParams } from "react-router-dom";

import DropdownButton from "react-bootstrap/DropdownButton";
import Dropdown from "react-bootstrap/Dropdown";

export default function ClusterDropdown(props) {
  const { orgID, datasetID, tabID, tagID } = useParams();
  const [tags, setTags] = useState({});
  const navigate = useNavigate();

  console.log("ClusterDropdown tags", tags);

  useEffect(() => {
    console.log("useEffect running", props.datasetIDs);
    if (!props.datasetIDs) {
      return;
    }

    let tgSubs = [];
    props.tagGroupIDs.forEach((tagGroupID) => {
      props.tagGroupsRef
        .doc(tagGroupID)
        .collection("tags")
        .where("deletionTimestamp", "==", "")
        .get()
        .then((snapshot) => {
          let newTags = Object.assign({}, tags);

          Object.keys(newTags).forEach((key) => {
            if (newTags[key].tagGroupID === tagGroupID) {
              delete newTags[key];
            }
          });

          snapshot.forEach((tagDoc) => {
            let tagData = tagDoc.data();
            tags[tagDoc.id] = {
              ID: tagDoc.id,
              name: tagData.name,
              tagGroupID: tagGroupID,
            };
          });

          setTags(newTags);
        });
    });

    return () => {
      tgSubs.forEach((unsub) => {
        unsub();
      });
    };
  }, [props.datasetIDs]);

  // Redirect if tag does not exist
  if (tagID && (!tags || !tags[tagID])) {
    return <Navigate to="/404" />;
  }

  let dropdownTitle = tagID ? tags[tagID].name : "Cluster";

  return (
    <DropdownButton
      style={{ minWidth: "8rem" }}
      title={dropdownTitle}
      variant={tabID === "cluster" ? "primary" : "link"}
      drop="down"
    >
      {Object.values(tags).map((tag) => (
        <Dropdown.Item
          onClick={() => {
            navigate(`/orgs/${orgID}/explore/${datasetID}/cluster/${tag.ID}`);
          }}
        >
          {tag.name}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
}
