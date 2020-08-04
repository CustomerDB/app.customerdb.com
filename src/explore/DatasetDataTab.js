import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import GridSelector from "../search/GridSelector.js";

export default function DatasetDataTab(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { datasetRef, documentsRef } = useFirestore();
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    if (props.dataset.documentIDs.length == 0) {
      return;
    }

    let unsubscribe = documentsRef
      .where("deletionTimestamp", "==", "")
      .where(
        window.firebase.firestore.FieldPath.documentId(),
        "in",
        props.dataset.documentIDs
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
  }, [documentsRef, props.dataset.documentIDs]);

  const onClick = (documentID) => {
    event("edit_dataset_data", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let newDocumentIDs = props.dataset.documentIDs.slice();

    if (props.dataset.documentIDs.includes(documentID)) {
      // Remove it.
      newDocumentIDs = newDocumentIDs.filter((id) => id !== documentID);
    } else {
      // If absent, add.
      newDocumentIDs.push(documentID);
    }

    if (newDocumentIDs.length == 0) {
      setDocuments([]);
      datasetRef.set(
        {
          documentIDs: [],
          tagGroupIDs: [],
        },
        { merge: true }
      );
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

        return datasetRef.set(
          {
            documentIDs: newDocumentIDs,
            tagGroupIDs: Array.from(newTagGroupIDs),
          },
          { merge: true }
        );
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
                index="staging_DOCUMENTS"
                documents={documents}
                selectedIDs={props.dataset.documentIDs}
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
