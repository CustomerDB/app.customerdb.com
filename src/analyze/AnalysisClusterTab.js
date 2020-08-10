import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import FocusContext from "../util/FocusContext.js";
import useFirestore from "../db/Firestore.js";

import Modal from "../shell/Modal.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { useParams } from "react-router-dom";

import AnalysisClusterBoard from "./AnalysisClusterBoard.js";
import { Loading } from "../util/Utils.js";

import { nanoid } from "nanoid";
import { ArrowsAngleExpand, ArrowsAngleContract } from "react-bootstrap-icons";

export default function AnalysisClusterTab(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const focus = useContext(FocusContext);
  const [boardKey, setBoardKey] = useState();

  const {
    documentsRef,
    allHighlightsRef,
    cardsRef,
    groupsRef,
    activeUsersRef,
  } = useFirestore();

  const { orgID, analysisID, tagID } = useParams();

  const [showRenameGroupModal, setShowRenameGroupModal] = useState(false);
  const [modalGroupID, setModalGroupID] = useState();
  const [modalGroupNonce, setModalGroupNonce] = useState();

  useEffect(() => {
    if (!analysisID || !tagID) {
      return;
    }
    setBoardKey(`${analysisID}-${tagID}`);
  }, [analysisID, tagID]);

  if (
    !documentsRef ||
    !cardsRef ||
    !allHighlightsRef ||
    !groupsRef ||
    !activeUsersRef
  ) {
    return <Loading />;
  }

  if (!props.analysis.documentIDs || props.analysis.documentIDs.length === 0) {
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
    .where("documentID", "in", props.analysis.documentIDs)
    .where("tagID", "==", tagID);

  let analysisDocumentsRef = documentsRef.where(
    window.firebase.firestore.FieldPath.documentId(),
    "in",
    props.analysis.documentIDs
  );

  const renameGroupModalCallback = (ID) => {
    // Trigger modal useEffect -- without this unstable key
    // the group rename modal does not show when renaming the
    // same group consecutively.
    //
    // TODO: fix this in a cleaner way.
    setModalGroupNonce(nanoid());
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
            <AnalysisClusterBoard
              analysisID={analysisID}
              analysisName={props.analysis.name}
              key={boardKey}
              orgID={orgID}
              userID={oauthClaims.user_id}
              tagID={tagID}
              documentsRef={analysisDocumentsRef}
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
        key={modalGroupNonce}
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
          key="rename"
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