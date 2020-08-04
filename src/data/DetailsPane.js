import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import Tabs from "../shell/Tabs.js";

import { Loading } from "../util/Utils.js";
import SearchDropdown from "../search/Dropdown.js";

function Field(props) {
  return (
    <Row className="mb-3" noGutters={true}>
      <Col>
        <p>
          <small>{props.name}</small>
        </p>
        <div>{props.children}</div>
      </Col>
    </Row>
  );
}

export default function DetailsPane(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const {
    peopleRef,
    tagGroupsRef,
    documentRef,
    deltasRef,
    highlightsRef,
  } = useFirestore();

  const [person, setPerson] = useState();
  const [tagGroups, setTagGroups] = useState();

  useEffect(() => {
    if (!peopleRef || !props.document.personID) {
      return;
    }

    return peopleRef.doc(props.document.personID).onSnapshot((doc) => {
      let data = doc.data();
      data.ID = doc.id;
      setPerson(data);
    });
  }, [peopleRef, props.document.personID]);

  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }
    return tagGroupsRef
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        console.debug("received tag groups snapshot");

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

        return documentRef.set(
          {
            tagGroupID: newTagGroupID,
          },
          { merge: true }
        );
      });
    }
  };

  if (!tagGroups) {
    return <Loading />;
  }

  return (
    <Tabs.Content>
      <Field name="Created by">{props.document.createdBy}</Field>
      <Field name="Link to customer">
        <SearchDropdown
          index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
          default={person ? person.name : ""}
          onChange={(ID, name) => {
            event("link_data_to_person", {
              orgID: oauthClaims.orgID,
              userID: oauthClaims.user_id,
            });

            documentRef.set(
              {
                personID: ID,
              },
              { merge: true }
            );
          }}
        />
      </Field>
      <Field name="Tag group">
        <Form.Control
          as="select"
          onChange={onTagGroupChange}
          value={props.document.tagGroupID}
        >
          <option key="" value="" style={{ fontStyle: "italic" }}>
            Choose a tag group...
          </option>
          {tagGroups.map((group) => {
            return (
              <option key={group.ID} value={group.ID}>
                {group.name}
              </option>
            );
          })}
        </Form.Control>
      </Field>
    </Tabs.Content>
  );
}
