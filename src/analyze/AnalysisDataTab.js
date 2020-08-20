import React, { useContext, useEffect, useState } from "react";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import GridSelector from "../search/GridSelector.js";
import Row from "react-bootstrap/Row";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function AnalysisDataTab(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { analysisRef, documentsRef, cardsRef } = useFirestore();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    if (props.analysis.documentIDs.length === 0) {
      return;
    }

    let unsubscribe = documentsRef
      .where("deletionTimestamp", "==", "")
      .where(
        window.firebase.firestore.FieldPath.documentId(),
        "in",
        props.analysis.documentIDs
      )
      .onSnapshot((snapshot) => {
        let newDocuments = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data["ID"] = doc.id;
          newDocuments.push(data);
        });

        setDocuments(newDocuments);
      });

    return unsubscribe;
  }, [documentsRef, props.analysis.documentIDs]);

  const onClick = (documentID) => {
    event("edit_analysis_data", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let newDocumentIDs = props.analysis.documentIDs.slice();

    let deleteDocumentCardsIfNecessary = () => {};

    if (props.analysis.documentIDs.includes(documentID)) {
      // Remove it.
      newDocumentIDs = newDocumentIDs.filter((id) => id !== documentID);

      // Register operation to delete cards after the analysis doc is updated.
      deleteDocumentCardsIfNecessary = () => {
        cardsRef
          .where("documentID", "==", documentID)
          .get()
          .then((snapshot) => {
            snapshot.forEach((doc) => {
              console.debug("deleting card", doc.data());
              doc.ref.delete();
            });
          });
      };
    } else {
      // If absent, add.
      newDocumentIDs.push(documentID);
    }

    if (newDocumentIDs.length === 0) {
      setDocuments([]);
      analysisRef
        .set(
          {
            documentIDs: [],
            tagGroupIDs: [],
          },
          { merge: true }
        )
        .then(deleteDocumentCardsIfNecessary);
      return;
    }

    documentsRef
      .where(
        window.firebase.firestore.FieldPath.documentId(),
        "in",
        newDocumentIDs
      )
      .get()
      .then((snapshot) => {
        let newTagGroupIDs = new Set();

        snapshot.forEach((doc) => {
          if (!doc.exists) {
            return;
          }

          let document = doc.data();
          if (document.tagGroupID) {
            newTagGroupIDs.add(document.tagGroupID);
          }
        });

        return analysisRef
          .set(
            {
              documentIDs: newDocumentIDs,
              tagGroupIDs: Array.from(newTagGroupIDs),
            },
            { merge: true }
          )
          .then(deleteDocumentCardsIfNecessary);
      });
  };

  return (
    <>
      <Container className="p-3">
        <Row>
          <Col>
            <p>Customer data in this exploration</p>
          </Col>
        </Row>
        <Row>
          <Col>
            <Container className="roundedBorders p-3 ">
              <GridSelector
                index={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX}
                documents={documents}
                selectedIDs={props.analysis.documentIDs}
                onItemClick={onClick}
                itemLimit={10}
                placeholder="Search and select up to 10 documents"
              />
            </Container>
          </Col>
        </Row>
      </Container>
    </>
  );
}
