import React from "react";

import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import DatasetClusterBoard from "./DatasetClusterBoard.js";

export default function DatasetClusterTab(props) {
  const {
    datasetRef,
    documentsRef,
    allHighlightsRef,
    cardsRef,
    groupsRef,
    activeUsersRef,
  } = useFirestore();

  if (!props.dataset.documentIDs || props.dataset.documentIDs.length === 0) {
    return (
      <Container className="p-3">
        <Row>
          <Col>
            <p>Select data to cluster on the data tab.</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // TODO: allow user to select what tag to cluster
  let tagID = "V7a9sjPoXaib1iS2qXkF"; // (problem)

  // NB: the `in` clause is limited to ten values for filtering.
  //     For now, we support clustering highlights from up to ten documents.
  let highlightsRef = allHighlightsRef
    .where("organizationID", "==", props.orgID)
    .where("documentID", "in", props.dataset.documentIDs)
    .where("tagID", "==", tagID);

  let datasetDocumentsRef = documentsRef.where(
    window.firebase.firestore.FieldPath.documentId(),
    "in",
    props.dataset.documentIDs
  );

  return (
    <Container className="p-3 fullHeight" fluid>
      <Row className="fullHeight">
        <Col>
          <DatasetClusterBoard
            documentsRef={datasetDocumentsRef}
            highlightsRef={highlightsRef}
            cardsRef={cardsRef}
            groupsRef={groupsRef}
            activeUsersRef={activeUsersRef}
          />
        </Col>
      </Row>
    </Container>
  );
}
