import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Modal from "../shell_obsolete/Modal.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";

export default function AnalysisDeleteModal(props) {
  const { oauthClaims } = useContext(UserAuthContext);
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
            event("delete_analysis", {
              orgID: oauthClaims.orgID,
              userID: oauthClaims.user_id,
            });

            props.analysisRef.set(
              {
                deletedBy: oauthClaims.email,
                deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            navigate(`/orgs/${orgID}/analyze`);
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
