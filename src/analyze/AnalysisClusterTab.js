import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AnalysisClusterBoard from "./AnalysisClusterBoard.js";
import Button from "react-bootstrap/Button";
import ClusterDropdown from "./ClusterDropdown.js";
import FocusContext from "../util/FocusContext.js";
import Form from "react-bootstrap/Form";
import FullscreenExitIcon from "@material-ui/icons/FullscreenExit";
import FullscreenIcon from "@material-ui/icons/Fullscreen";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import Modal from "../shell_obsolete/Modal.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";

export default function AnalysisClusterTab(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const focus = useContext(FocusContext);
  const [boardKey, setBoardKey] = useState();
  const navigate = useNavigate();

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
  const [fullscreen, setFullscreen] = useState(false);

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
    navigate(`/orgs/${orgID}/analyze/${analysisID}/data`);
  }

  if (!tagID) {
    return (
      <>
        <ClusterDropdown analysis={props.analysis} />
      </>
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

  let arrows = <FullscreenIcon />;
  if (focus.focus === "cluster") {
    arrows = <FullscreenExitIcon />;
  }

  return (
    <Grid
      container
      item
      xs={12}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <ClusterDropdown analysis={props.analysis} />
      <div
        style={
          fullscreen
            ? {
                position: "absolute",
                top: "4rem",
                left: "1rem",
                zIndex: 10,
                width: "calc(100% - 1rem)",
                height: "calc(100% - 4rem)",
              }
            : { position: "relative", width: "100%", flexGrow: 1 }
        }
      >
        <Button
          variant="link"
          title="Toggle expand"
          style={{
            color: "black",
            background: "#ddf",
            border: "0",
            borderRadius: "0.25rem",
            position: "absolute",
            right: "0.25rem",
            top: "4rem",
            zIndex: 200,
            opacity: 0.8,
          }}
          onClick={() => {
            setFullscreen(!fullscreen);
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
      </div>
      <RenameGroupModal
        key={modalGroupNonce}
        groupID={modalGroupID}
        show={showRenameGroupModal}
        onHide={() => setShowRenameGroupModal(false)}
      />
    </Grid>
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
