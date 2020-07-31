import React, { useContext, useState, useEffect } from "react";

import FocusContext from "../util/FocusContext.js";

import useFirestore from "../db/Firestore.js";

import Modal from "../shell/Modal.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { useParams } from "react-router-dom";

import DatasetClusterBoard from "./DatasetClusterBoard.js";
import { Loading } from "../util/Utils.js";

import { ArrowsAngleExpand, ArrowsAngleContract } from "react-bootstrap-icons";

export default function DatasetClusterTab(props) {
  const focus = useContext(FocusContext);
  const [boardKey, setBoardKey] = useState();

  const {
    documentsRef,
    allHighlightsRef,
    cardsRef,
    groupsRef,
    activeUsersRef,
  } = useFirestore();

  const { orgID, datasetID, tagID } = useParams();

  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false);
  const [modalGroupID, setModalGroupID] = useState();

  useEffect(() => {
    if (!datasetID || !tagID) {
      return;
    }
    setBoardKey(`${datasetID}-${tagID}`);
  }, [datasetID, tagID]);

  if (
    !documentsRef ||
    !cardsRef ||
    !allHighlightsRef ||
    !groupsRef ||
    !activeUsersRef
  ) {
    return <Loading />;
  }

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

  const renameGroupModalCallback = (ID) => {
    setModalGroupID(ID);
    setShowRenameGroupModal(true);
  };

  let arrows = <ArrowsAngleExpand />;
  if (focus.focus === "cluster") {
    arrows = <ArrowsAngleContract />;
  }

  return (
    <>
      <Container className="p-3 h-100" fluid>
        <Row className="h-100">
          <Col>
            <Button
              variant="link"
              title="Toggle expand"
              style={{
                color: "black",
                background: "#ddf",
                border: "0",
                borderRadius: "0.25rem",
                position: "absolute",
                top: "-2rem",
                right: "0.25rem",
                zIndex: 200,
                opacity: 0.8,
              }}
              onClick={() => {
                if (focus.focus === "cluster") {
                  focus.setFocus();
                  return;
                }
                focus.setFocus("cluster");
              }}
            >
              {arrows}
            </Button>
            <DatasetClusterBoard
              key={boardKey}
              tagID={tagID}
              documentsRef={datasetDocumentsRef}
              highlightsRef={highlightsRef}
              cardsRef={cardsRef}
              groupsRef={groupsRef}
              activeUsersRef={activeUsersRef}
              renameGroupModalCallback={renameGroupModalCallback}
            />
          </Col>
        </Row>
      </Container>
      <RenameGroupModal
        groupID={modalGroupID}
        show={showRenameGroupModal}
        onHide={() => setShowRenameGroupModal(false)}
      />
    </>
  );
}

function RenameGroupModal(props) {
  const [group, setGroup] = useState();
  const [name, setName] = useState();
  const { groupsRef } = useFirestore();

  useEffect(() => {
    if (!props.groupID || !groupsRef) {
      return;
    }

    groupsRef
      .doc(props.groupID)
      .get()
      .then((doc) => {
        if (doc.exists) {
          let data = doc.data();
          data.ID = doc.id;
          setName(data.name);
          setGroup(data);
        }
      });
  }, [props.groupID, groupsRef]);

  if (!group) {
    return <></>;
  }

  return (
    <Modal
      name="Rename group"
      show={props.show}
      onHide={() => {
        setName();
        setGroup();
        props.onHide();
      }}
      footer={[
        <Button
          onClick={() => {
            groupsRef.doc(props.groupID).set(
              {
                name: name,
              },
              { merge: true }
            );
          }}
        >
          Save
        </Button>,
      ]}
    >
      <Form.Control
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
        }}
      />
    </Modal>
  );
}
