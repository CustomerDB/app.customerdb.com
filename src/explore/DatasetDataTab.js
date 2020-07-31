import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function DatasetDataTab(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { datasetRef, documentsRef } = useFirestore();
  const [documents, setDocuments] = useState({});

  useEffect(() => {
    if (!documentsRef) {
      return;
    }
    let unsubscribe = documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newDocuments = {};
        snapshot.forEach((doc) => {
          let data = doc.data();
          data["ID"] = doc.id;
          newDocuments[doc.id] = data;
        });

        setDocuments(newDocuments);
      });

    return unsubscribe;
  }, [documentsRef]);

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

    let newTagGroupIDs = new Set();
    newDocumentIDs.forEach((id) => {
      if (documents[id].tagGroupID) {
        newTagGroupIDs.add(documents[id].tagGroupID);
      }
    });

    datasetRef.set(
      {
        documentIDs: newDocumentIDs,
        tagGroupIDs: Array.from(newTagGroupIDs),
      },
      { merge: true }
    );
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
              <Row>
                {Object.values(documents).map((document) => {
                  let active = false;
                  let enabled = true;
                  if (
                    props.dataset.documentIDs !== undefined &&
                    props.dataset.documentIDs.includes(document.ID)
                  ) {
                    // listCardClass = "listCardActive";
                    active = true;
                  } else if (
                    props.dataset.documentIDs &&
                    props.dataset.documentIDs.length >= 10
                  ) {
                    // listCardClass = "listCardInactive";
                    enabled = false;
                  }

                  let listCardClass = "listCard";
                  if (!enabled) {
                    listCardClass = "listCardInactive";
                  }

                  if (active) {
                    listCardClass = "listCardActive";
                  }

                  return (
                    <Col key={document.ID} md={4} className="p-1">
                      <Container className={listCardClass}>
                        <Row className="h-100">
                          <Col
                            className="listTitleContainer align-self-center"
                            md={8}
                          >
                            <p
                              className="listCardTitle"
                              onClick={
                                enabled
                                  ? () => {
                                      onClick(document.ID);
                                    }
                                  : () => {}
                              }
                            >
                              {document.name}
                            </p>
                          </Col>
                        </Row>
                      </Container>
                    </Col>
                  );
                })}
              </Row>
            </Container>
            <p>
              <i>Click to select customer data (up to 10 documents)</i>
            </p>
          </Col>
        </Row>
      </Container>
    </>
  );
}
