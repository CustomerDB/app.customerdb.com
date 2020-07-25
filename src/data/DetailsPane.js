import React, { useState, useEffect } from "react";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import Tabs from "../shell/Tabs.js";

import { Loading } from "../util/Utils.js";

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
  const [people, setPeople] = useState();
  const [tagGroups, setTagGroups] = useState();

  // TODO: Replace with search dropdown.
  useEffect(() => {
    return props.peopleRef
      .where("deletionTimestamp", "==", "")
      .orderBy("name")
      .onSnapshot((snapshot) => {
        let newPeople = [];

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newPeople.push(data);
        });

        setPeople(newPeople);
      });
  }, []);

  useEffect(() => {
    return props.tagGroupsRef.onSnapshot((snapshot) => {
      console.debug("received tag groups snapshot");

      let tagGroups = [];

      snapshot.forEach((doc) => {
        let data = doc.data();
        data.ID = doc.id;
        tagGroups.push(data);
      });

      setTagGroups(tagGroups);
    });
  }, []);

  const onPersonChange = (e) => {
    let newPersonID = e.target.value;

    props.documentRef.set(
      {
        personID: newPersonID,
      },
      { merge: true }
    );
  };

  const onTagGroupChange = (e) => {
    let newTagGroupID = e.target.value;

    // TODO: Reintroduce tag cleanup for the document.
    //       OR move to the contentsPane.

    // if (newTagGroupID !== props.document.tagGroupID) {
    //   // Confirm this change if the the set of highlights is not empty.
    //   let numHighlights = Object.keys(this.highlights).length;
    //   if (numHighlights > 0) {
    //     console.debug("TODO: use a modal for this instead");
    //     let proceed = window.confirm(
    //       `This operation will delete ${numHighlights} highlights.\nAre you sure you want to change tag groups?`
    //     );

    //     if (!proceed) {
    //       console.debug("user declined to proceeed changing tag group");
    //       e.target.value = props.document.tagGroupID;
    //       return;
    //     }

    //     // Remove the highlight format from the existing text.
    //     let editor = this.reactQuillRef.getEditor();

    //     let delta = editor.removeFormat(
    //       0,
    //       editor.getLength(),
    //       "highlight",
    //       false, // unsets the target format
    //       "user"
    //     );

    //     this.localDelta = this.localDelta.compose(delta);
    //   }

    props.documentRef.set(
      {
        tagGroupID: newTagGroupID,
      },
      { merge: true }
    );
  };

  if (!people || !tagGroups) {
    return <Loading />;
  }

  return (
    <Tabs.Content>
      <Field name="Created by">{props.document.createdBy}</Field>
      <Field name="Link to customer">
        <Form.Control
          as="select"
          onChange={onPersonChange}
          value={props.document.personID}
        >
          <option value="" style={{ fontStyle: "italic" }}>
            Choose person...
          </option>
          {people.map((person) => {
            return (
              <option key={person.ID} value={person.ID}>
                {person.name}
              </option>
            );
          })}
        </Form.Control>
      </Field>
      <Field name="Tag group">
        <Form.Control
          as="select"
          onChange={onTagGroupChange}
          value={props.document.tagGroupID}
        >
          <option value="" style={{ fontStyle: "italic" }}>
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
