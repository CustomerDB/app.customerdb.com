import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

export default function DatasetDataTab(props) {
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
                  let listCardClass = "listCard";

                  if (
                    props.dataset.documentIDs !== undefined &&
                    props.dataset.documentIDs.includes(document.ID)
                  ) {
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
                              onClick={() => {
                                onClick(document.ID);
                              }}
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
              <i>Click to select customer data</i>
            </p>
          </Col>
        </Row>
      </Container>
    </>
  );
}
