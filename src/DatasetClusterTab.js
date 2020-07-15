import React from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import DatasetClusterBoard from './DatasetClusterBoard.js';

export default function DatasetClusterTab(props) {
  let cardsRef = props.datasetRef.collection("cards");
  let groupsRef = props.datasetRef.collection("groups");
  let activeUsersRef = props.datasetRef.collection("activeUsers");

  // Faking the document selection for now...
  // TODO: get this from props.dataset.documentIDs
  let documentIDs = [
    "PnHhykH1yC0Mb6JFjnm4",
    "V7Di7RDYDcy3mBIHAHyd",
    "vcigWItnhGt4ETuw2Czk"
  ];

  // TODO: allow user to select what tag to cluster
  let tagID = "V7a9sjPoXaib1iS2qXkF";  // (problem)

  // NB: the `in` clause is limited to ten values for filtering.
  //     For now, we support clustering highlights from up to ten documents.
  let highlightsRef = props.allHighlightsRef
    .where('organizationID', '==', props.orgID)
    .where('documentID', 'in', documentIDs)
    .where("tagID", "==", tagID)

  return <Row>
    <Col>
      <DatasetClusterBoard
        user={props.user}
        highlightsRef={highlightsRef}
        cardsRef={cardsRef}
        groupsRef={groupsRef}
        activeUsersRef={activeUsersRef}
        documentIDs={documentIDs} />
    </Col>
  </Row>;
}
