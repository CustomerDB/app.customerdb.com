import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "react-bootstrap/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Modal from "../shell_obsolete/Modal.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";

export default function AnalysisDeleteModal(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [analysis, setAnalysis] = useState();

  useEffect(() => {
    if (!props.analysisRef) {
      return;
    }

    props.analysisRef.get().then((doc) => {
      let analysis = doc.data();
      analysis.ID = doc.id;
      setAnalysis(analysis);
    });
  }, [props.show, props.analysisRef]);

  if (!analysis) {
    return <></>;
  }

  return (
    <Modal
      key={analysis.ID}
      name="Delete analysis"
      show={props.show}
      onHide={props.onHide}
      footer={[
        <Button
          key={analysis.ID}
          onClick={() => {
            event(firebase, "delete_analysis", {
              orgID: orgID,
              userID: oauthClaims.user_id,
            });

            props.analysisRef.update({
              deletedBy: oauthClaims.email,
              deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            navigate(`/orgs/${orgID}/boards`);
          }}
        >
          Delete
        </Button>,
      ]}
    >
      <p>
        Do you want to delete <b>{analysis.name}</b>?
      </p>
    </Modal>
  );
}
