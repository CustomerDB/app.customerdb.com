import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import Tags, { addTagStyles, removeTagStyles } from "./Tags.js";

import Tabs from "../shell/Tabs.js";
import SearchDropdown from "../search/Dropdown.js";

import Moment from "react-moment";
import Avatar from "react-avatar";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Pencil, X } from "react-bootstrap-icons";

import { useParams, Link } from "react-router-dom";

export default function DocumentSidebar(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const {
    documentRef,
    tagGroupsRef,
    peopleRef,
    highlightsRef,
    deltasRef,
  } = useFirestore();

  const [person, setPerson] = useState();
  const [tagGroupName, setTagGroupName] = useState("Tags");
  const [tags, setTags] = useState();
  const [tagGroups, setTagGroups] = useState();
  const [editPerson, setEditPerson] = useState(false);
  const [editTagGroup, setEditTagGroup] = useState(false);

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
    event("change_data_tag_group", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    // Preserve synthetic event reference for use in async code below
    e.persist();

    let newTagGroupID = e.target.value;

    if (newTagGroupID !== props.document.tagGroupID) {
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
            e.target.value = props.document.tagGroupID;
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
          .then(() => {
            setEditTagGroup(false);
          });
      });
    }
  };

  return (
    <Tabs.SidePane>
      <Tabs.SidePaneCard>
        <p>
          <b>Created by</b>
        </p>
        <p>
          {props.document.createdBy}
          <br />
          <em>
            <Moment fromNow date={props.document.creationTimestamp.toDate()} />
          </em>
        </p>
      </Tabs.SidePaneCard>
      <Tabs.SidePaneCard>
        <div style={{ position: "relative" }}>
          <p>
            <b>Linked Person</b>
          </p>
          {person && !editPerson ? (
            <>
              <Button
                onClick={() => {
                  setEditPerson(true);
                }}
                style={{
                  color: "black",
                  background: "#e9e9e9",
                  border: "0",
                  borderRadius: "0.25rem",
                  position: "absolute",
                  right: "-1rem",
                  top: "-1rem",
                }}
              >
                <Pencil />
              </Button>
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
            </>
          ) : (
            <>
              {props.document.personID && (
                <Button
                  onClick={() => {
                    setEditPerson(false);
                  }}
                  style={{
                    color: "black",
                    background: "#e9e9e9",
                    border: "0",
                    borderRadius: "0.25rem",
                    position: "absolute",
                    right: "-1rem",
                    top: "-1rem",
                  }}
                >
                  <X />
                </Button>
              )}
              <div className="d-flex">
                <SearchDropdown
                  index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
                  default={person ? person.name : ""}
                  onChange={(ID, name) => {
                    event("link_data_to_person", {
                      orgID: oauthClaims.orgID,
                      userID: oauthClaims.user_id,
                    });

                    documentRef
                      .set(
                        {
                          personID: ID,
                        },
                        { merge: true }
                      )
                      .then(() => {
                        setEditPerson(false);
                      });
                  }}
                />
              </div>
            </>
          )}
        </div>
      </Tabs.SidePaneCard>
      <Tabs.SidePaneCard>
        <div style={{ position: "relative" }}>
          {tags && !editTagGroup ? (
            <>
              <p>
                <b>{tagGroupName}</b>
              </p>

              <Button
                onClick={() => {
                  setEditTagGroup(true);
                }}
                style={{
                  color: "black",
                  background: "#e9e9e9",
                  border: "0",
                  borderRadius: "0.25rem",
                  position: "absolute",
                  right: "-1rem",
                  top: "-1rem",
                }}
              >
                <Pencil />
              </Button>
              <Tags
                tagGroupName={tagGroupName}
                tags={tags}
                tagIDsInSelection={props.tagIDsInSelection}
                onChange={props.onTagControlChange}
              />
            </>
          ) : (
            <>
              <p>
                <b>Tag Group</b>
              </p>
              {props.document.tagGroupID && (
                <Button
                  onClick={() => {
                    setEditTagGroup(false);
                  }}
                  style={{
                    color: "black",
                    background: "#e9e9e9",
                    border: "0",
                    borderRadius: "0.25rem",
                    position: "absolute",
                    right: "-1rem",
                    top: "-1rem",
                  }}
                >
                  <X />
                </Button>
              )}
              <Form.Control
                as="select"
                onChange={onTagGroupChange}
                value={props.document.tagGroupID}
              >
                <option key="" value="" style={{ fontStyle: "italic" }}>
                  Choose a tag group...
                </option>
                {tagGroups &&
                  tagGroups.map((group) => {
                    return (
                      <option key={group.ID} value={group.ID}>
                        {group.name}
                      </option>
                    );
                  })}
              </Form.Control>
            </>
          )}
        </div>
      </Tabs.SidePaneCard>
    </Tabs.SidePane>
  );
}
