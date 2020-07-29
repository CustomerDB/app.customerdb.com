import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { Loading } from "../util/Utils.js";

export default function DatasetAnalysisTab(props) {
  const {
    documentsRef,
    cardsRef,
    groupsRef,
    allHighlightsRef,
    allTagsRef,
  } = useFirestore();

  const [groups, setGroups] = useState();
  const [cards, setCards] = useState();
  const [highlights, setHighlights] = useState();
  const [documents, setDocuments] = useState();
  const [tags, setTags] = useState();

  console.log("Render analysis tab ", props);

  useEffect(() => {
    if (!groupsRef) {
      return;
    }

    groupsRef.onSnapshot((snapshot) => {
      let newGroups = {};
      snapshot.forEach((doc) => {
        newGroups[doc.id] = doc.data();
      });
      setGroups(newGroups);
    });
  }, [groupsRef]);

  useEffect(() => {
    if (!cardsRef) {
      return;
    }

    cardsRef.onSnapshot((snapshot) => {
      let newCards = {};
      snapshot.forEach((doc) => {
        newCards[doc.id] = doc.data();
      });
      setCards(newCards);
    });
  }, [cardsRef]);

  useEffect(() => {
    if (!allHighlightsRef || !props.orgID || !props.dataset.documentIDs) {
      return;
    }

    console.log("Getting highlights for ", props.dataset.documentIDs);

    let highlightsRef = allHighlightsRef
      .where("organizationID", "==", props.orgID)
      .where("documentID", "in", props.dataset.documentIDs);

    highlightsRef.onSnapshot((snapshot) => {
      let newHighlights = {};
      console.log("Received highlights");
      snapshot.forEach((doc) => {
        newHighlights[doc.id] = doc.data();
      });
      setHighlights(newHighlights);
    });
  }, [allHighlightsRef, props.orgID, props.dataset.documentIDs]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    let datasetDocumentsRef = documentsRef.where(
      window.firebase.firestore.FieldPath.documentId(),
      "in",
      props.dataset.documentIDs
    );

    let newDocuments = {};
    datasetDocumentsRef.onSnapshot((snapshot) => {
      snapshot.forEach((doc) => {
        newDocuments[doc.id] = doc.data();
      });
    });
    setDocuments(documents);
  }, [documentsRef]);

  useEffect(() => {
    if (!allTagsRef) {
      return;
    }

    allTagsRef
      .where("organizationID", "==", props.orgID)
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          newTags[doc] = doc.data();
        });
        setTags(newTags);
      });
  }, [allTagsRef]);

  console.log("groups", groups);
  console.log("highlights", highlights);
  console.log("cards", cards);
  console.log("documents", documents);
  console.log("tags", tags);

  if (
    !documentsRef ||
    !cardsRef ||
    !allHighlightsRef ||
    !groupsRef ||
    !allTagsRef
  ) {
    return <Loading />;
  }

  return (
    <>
      <Container className="p-3">
        <Row>
          <Col>
            <h3></h3>
          </Col>
        </Row>
        <Row>
          <Col></Col>
        </Row>
      </Container>
    </>
  );
}
