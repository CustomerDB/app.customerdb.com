import React, { useContext } from "react";

import FocusContext from "../util/FocusContext.js";

import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

import { useParams } from "react-router-dom";

import DatasetClusterBoard from "./DatasetClusterBoard.js";

import { ArrowsAngleExpand, ArrowsAngleContract } from "react-bootstrap-icons";

export default function DatasetClusterTab(props) {
  const focus = useContext(FocusContext);

  const {
    datasetRef,
    documentsRef,
    allHighlightsRef,
    cardsRef,
    groupsRef,
    activeUsersRef,
  } = useFirestore();

  const { orgID, tagID } = useParams();

  if (!props.dataset.documentIDs || props.dataset.documentIDs.length == 0) {
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

  if (!tagID) {
    return (
      <Container className="p-3">
        <Row>
          <Col>
            <p>Select tag to cluster using the cluster dropdown.</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // NB: the `in` clause is limited to ten values for filtering.
  //     For now, we support clustering highlights from up to ten documents.
  let highlightsRef = allHighlightsRef
    .where("organizationID", "==", orgID)
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
          <Button
            variant="link"
            style={{ position: "absolute", right: 0 }}
            onClick={() => {
              if (focus.focus === "cluster") {
                focus.setFocus();
                return;
              }
              focus.setFocus("cluster");
            }}
          >
            {focus.focus === "cluster" ? (
              <ArrowsAngleContract />
            ) : (
              <ArrowsAngleExpand />
            )}
          </Button>
        </Col>
      </Row>
    </Container>
  );
}
