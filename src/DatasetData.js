import React, { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function DatasetData(props) {
  const [documents, setDocuments] = useState([]);

  const onClick = (documentID) => {
    let newDocumentIDs = props.dataset.documentIDs.slice();
    console.log("DatasetData select (before)", newDocumentIDs);

    if (props.dataset.documentIDs.includes(documentID)) {
      // Remove it.
      newDocumentIDs = newDocumentIDs.filter(id => id !== documentID);
    } else {
      // If absent, add.
      newDocumentIDs.push(documentID);
    }

    console.log("DatasetData select (after)", newDocumentIDs);

    props.datasetRef.set({
      documentIDs: newDocumentIDs
    }, {merge: true});
  };

  useEffect(() => {
    if (props.documentsRef === undefined) {
      return;
    }

    let unsubscribe = props.documentsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot(snapshot => {
      let newDocuments = {};
      snapshot.forEach(doc => {
        let data = doc.data();
        data['ID'] = doc.id;
        newDocuments[doc.id] = data;
      });

      console.log("Set new documents: ", newDocuments);
      setDocuments(newDocuments);
    });

    return unsubscribe;
  }, [props.documentsRef]);

  console.log("props.dataset", props.dataset);

  return <>
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
          {(Object.values(documents)).map(document => {
            let listCardClass = "listCard";

            if (props.dataset.documentIDs !== undefined && props.dataset.documentIDs.includes(document.ID)) {
              listCardClass = "listCardActive";
            }

            return <Col md={4} className="p-1">
              <Container className={listCardClass}>
                <Row className="h-100">
                  <Col className="listTitleContainer align-self-center" md={8}>
                    <p className="listCardTitle" onClick={() => {onClick(document.ID)}}>{document.name}</p>
                  </Col>
                </Row>
              </Container>
            </Col>
          })}
        </Row>
        </Container>
        <p><i>Click to select customer data</i></p>
      </Col>
    </Row>
  </Container>
  </>;
}
