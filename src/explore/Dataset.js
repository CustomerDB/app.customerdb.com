import React from "react";

import Content from "../shell/Content.js";

import { useParams, useNavigate, Navigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import ClusterDropdown from "./ClusterDropdown.js";
import DatasetDataTab from "./DatasetDataTab.js";
import DatasetClusterTab from "./DatasetClusterTab.js";
import DatasetAnalysisTab from "./DatasetAnalysisTab.js";

export default function Dataset(props) {
  const { orgID, datasetID, tabID, tagID } = useParams();
  const navigate = useNavigate();

  // Give a hint if this dataset was deleted while in view.
  if (props.dataset.deletionTimestamp !== "") {
    let date = this.state.deletionTimestamp.toDate();

    return (
      <Content>
        <Content.Title>
          {props.dataset.name} was deleted on {date}
        </Content.Title>
      </Content>
    );
  }

  // Redirect if tab does not exist
  if (tabID && !["data", "cluster", "analysis"].includes(tabID)) {
    return <Navigate to="/404" />;
  }

  let controls = (
    <Row noGutters={true}>
      <Button
        style={{ marginRight: "1em" }}
        key="analysis"
        variant={tabID === "analysis" ? "primary" : "link"}
        onClick={() => {
          navigate(`/orgs/${orgID}/explore/${datasetID}/analysis`);
        }}
      >
        Analysis
      </Button>

      <ClusterDropdown dataset={props.dataset} />

      <Button
        style={{ marginRight: "1em" }}
        key="data"
        variant={!tabID || tabID === "data" ? "primary" : "link"}
        onClick={() => {
          navigate(`/orgs/${orgID}/explore/${datasetID}/data`);
        }}
      >
        Data
      </Button>
    </Row>
  );

  let view = <></>;

  if (!tabID || tabID === "data") {
    view = (
      <DatasetDataTab
        dataset={props.dataset}
        datasetRef={props.datasetRef}
        documentsRef={props.documentsRef}
      />
    );
  }

  if (tabID === "cluster") {
    view = (
      <DatasetClusterTab
        key={`${datasetID}-${tagID}`}
        orgID={orgID}
        dataset={props.dataset}
        datasetRef={props.datasetRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

  if (tabID === "analysis") {
    view = (
      <DatasetAnalysisTab
        key={`${datasetID}-${tagID}`}
        orgID={orgID}
        dataset={props.dataset}
        datasetRef={props.datasetRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
      />
    );
  }

  return (
    <>
      <Content>
        <Content.Title>
          <Content.Name>{props.dataset.name}</Content.Name>
          <Content.Options>{props.options}</Content.Options>
        </Content.Title>
        {controls}
        {view}
      </Content>
    </>
  );
}
