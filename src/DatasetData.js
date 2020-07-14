import React, { useEffect, useState } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function DatasetData(props) {
  const [documents, setDocuments] = useState([]);

  const onClick = (documentID) => {
    let dataset = {};
    Object.assign(dataset, props.dataset);
    let documentIDs = dataset.documentIDs;

    if (documentIDs === undefined) {
      documentIDs = [documentID];
    } else {
      let index = documentIDs.findIndex((id) => id == documentID);
      if (index > 0) {
        // If present, remove.
        documentIDs.splice(index, 1);
      } else {
        // If absent, add.
        documentIDs.push(documentID);
      }
    }

    props.datasetRef.set({
      documentIDs: documentIDs
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
