import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "../shell_obsolete/Modal.js";

export default function AnalysisRenameModal(props) {
  const navigate = useNavigate();

  const { orgID } = useParams();

  const [analysis, setAnalysis] = useState();
  const [name, setName] = useState();

  useEffect(() => {
    if (!props.analysisRef) {
      return;
    }

    props.analysisRef.get().then((doc) => {
      let analysis = doc.data();
      analysis.ID = doc.id;
      setName(analysis.name);
      setAnalysis(analysis);
    });
  }, [props.show, props.analysisRef]);

  if (!analysis) {
    return <></>;
  }

  return (
    <Modal
      key={analysis.ID}
      name="Rename analysis"
      show={props.show}
      onHide={props.onHide}
      footer={[
        <Button
          key={analysis.ID}
          onClick={() => {
            props.analysisRef.update({ name: name });

            navigate(`/orgs/${orgID}/analyze/${analysis.ID}`);
          }}
        >
          Save
        </Button>,
      ]}
    >
      <Form.Label>Name</Form.Label>
      <Form.Control value={name} onChange={(e) => setName(e.target.value)} />
    </Modal>
  );
}
