import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";
import Tags, { addTagStyles, removeTagStyles } from "./Tags.js";

import Tabs from "../shell/Tabs.js";

import Avatar from "react-avatar";

import { useParams, Link } from "react-router-dom";

export default function DocumentSidebar(props) {
  const { orgID } = useParams();

  const { tagGroupsRef, peopleRef } = useFirestore();

  const [person, setPerson] = useState();
  const [tagGroupName, setTagGroupName] = useState("Tags");
  const [tags, setTags] = useState();

  // Subscribe to person linked to this document.
  useEffect(() => {
    if (!peopleRef || !props.document || !props.document.personID) {
      return;
    }

    peopleRef.doc(props.document.personID).onSnapshot((doc) => {
      let person = doc.data();
      person.ID = doc.id;
      setPerson(person);
    });
  }, [props.document, peopleRef]);

  // Subscribe to document's tag group name.
  useEffect(() => {
    if (!props.document.tagGroupID || !tagGroupsRef) {
      return;
    }

    return tagGroupsRef.doc(props.document.tagGroupID).onSnapshot((doc) => {
      let tagGroupData = doc.data();
      setTagGroupName(tagGroupData.name);
    });
  }, [props.document.tagGroupID, tagGroupsRef]);

  // Subscribe to tags for the document's tag group.
  useEffect(() => {
    if (!props.document.tagGroupID || !tagGroupsRef) {
      return;
    }

    let unsubscribe = tagGroupsRef
      .doc(props.document.tagGroupID)
      .collection("tags")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newTags[data.ID] = data;
        });
        setTags(newTags);
        addTagStyles(newTags);
      });
    return () => {
      removeTagStyles();
      unsubscribe();
    };
  }, [props.document.tagGroupID, tagGroupsRef]);

  return (
    <Tabs.SidePane>
      <Tabs.SidePaneCard>
        {person ? (
          <div className="d-flex">
            <div>
              <Avatar size={50} name={person.name} round={true} />
            </div>
            <div className="pl-3">
              <b>
                <Link to={`/orgs/${orgID}/people/${person.ID}`}>
                  {person.name}
                </Link>
              </b>
              <br />
              {person.company}
              <br />
              {person.job}
            </div>
          </div>
        ) : (
          <div>
            <p>
              Get additional context by linking to person in the details pane
            </p>
          </div>
        )}
      </Tabs.SidePaneCard>
      <Tabs.SidePaneCard>
        <Tags
          tagGroupName={tagGroupName}
          tags={tags}
          tagIDsInSelection={props.tagIDsInSelection}
          onChange={props.onTagControlChange}
        />
      </Tabs.SidePaneCard>
    </Tabs.SidePane>
  );
}
