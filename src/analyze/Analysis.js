import React from "react";

import Content from "../shell/Content.js";

import { useParams, useNavigate, Navigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import ClusterDropdown from "./ClusterDropdown.js";
import AnalysisDataTab from "./AnalysisDataTab.js";
import AnalysisClusterTab from "./AnalysisClusterTab.js";
import AnalysisSummaryTab from "./AnalysisSummaryTab.js";

export default function Analysis(props) {
  const { orgID, analysisID, tabID, tagID } = useParams();
  const navigate = useNavigate();

  // Give a hint if this analysis was deleted while in view.
  if (props.analysis.deletionTimestamp !== "") {
    let date = this.state.deletionTimestamp.toDate();

    return (
      <Content>
        <Content.Title>
          {props.analysis.name} was deleted on {date}
        </Content.Title>
      </Content>
    );
  }

  // Redirect if tab does not exist
  if (tabID && !["data", "cluster", "summary"].includes(tabID)) {
    return <Navigate to="/404" />;
  }

  let controls = (
    <Row noGutters={true}>
      <Button
        style={{ marginRight: "1em" }}
        key="summary"
        variant={!tabID || tabID === "summary" ? "primary" : "link"}
        onClick={() => {
          navigate(`/orgs/${orgID}/analyze/${analysisID}/summary`);
        }}
      >
        Summary
      </Button>

      <ClusterDropdown analysis={props.analysis} />

      <Button
        style={{ marginRight: "1em" }}
        key="data"
        variant={tabID === "data" ? "primary" : "link"}
        onClick={() => {
          navigate(`/orgs/${orgID}/analyze/${analysisID}/data`);
        }}
      >
        Data
      </Button>
    </Row>
  );

  let view = <></>;

  if (!tabID || tabID === "summary") {
    view = (
      <AnalysisSummaryTab
        key={`${analysisID}-${tagID}`}
        orgID={orgID}
        analysis={props.analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

  if (tabID === "data") {
    view = (
      <AnalysisDataTab
        analysis={props.analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
      />
    );
  }

  if (tabID === "cluster") {
    view = (
      <AnalysisClusterTab
        key={`${analysisID}-${tagID}`}
        orgID={orgID}
        analysis={props.analysis}
        analysisRef={props.analysisRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

  return (
    <>
      <Content>
        <Content.Title>
          <Content.Name>{props.analysis.name}</Content.Name>
          <Content.Options>{props.options}</Content.Options>
        </Content.Title>
        {controls}
        {view}
      </Content>
    </>
  );
}
