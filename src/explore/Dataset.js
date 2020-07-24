import React, { useState, useEffect } from "react";

import Tabs from "../shell/Tabs.js";
import Content from "../shell/Content.js";

import { useParams, useNavigate, Navigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

import DatasetDataTab from "./DatasetDataTab.js";
import DatasetClusterTab from "./DatasetClusterTab.js";

export default function Dataset(props) {
  const { orgID, datasetID, tabID, tagID } = useParams();
  const [tags, setTags] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: build set of tags based on documentIDs
    setTags({ V7a9sjPoXaib1iS2qXkF: { name: "Problem" } });
  }, [props.dataset]);

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
  if (tabID && !["data", "cluster"].includes(tabID)) {
    return <Navigate to="/404" />;
  }

  // Redirect if tag does not exist
  if (tagID && (!tags || !tags[tagID])) {
    return <Navigate to="/404" />;
  }

  let dropdownTitle = tagID ? tags[tagID].name : "Cluster";

  let controls = (
    <Row>
      <Button
        style={{ marginRight: "1em" }}
        key="data"
        variant={tabID === "data" ? "primary" : "link"}
        onClick={() => {
          navigate(`/orgs/${orgID}/explore/${datasetID}/data`);
        }}
      >
        Data
      </Button>

      <DropdownButton
        style={{ minWidth: "8rem" }}
        title={dropdownTitle}
        variant={tabID === "cluster" ? "primary" : "link"}
        drop="down"
      >
        <Dropdown.Item
          onClick={() => {
            navigate(
              `/orgs/${orgID}/explore/${datasetID}/cluster/V7a9sjPoXaib1iS2qXkF`
            );
          }}
        >
          Problem
        </Dropdown.Item>
      </DropdownButton>
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
