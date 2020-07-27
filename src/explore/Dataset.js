import React from "react";

import Tabs from "../shell/Tabs.js";
import Content from "../shell/Content.js";

import { useParams, Navigate } from "react-router-dom";

import DatasetDataTab from "./DatasetDataTab.js";
import DatasetClusterTab from "./DatasetClusterTab.js";

export default function Dataset(props) {
  let { orgID, tabID } = useParams();

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

  if (tabID) {
    return <Navigate to="/404" />;
  }

  return (
    <>
      <Content>
        <Content.Title>
          <Content.Name>{props.dataset.name}</Content.Name>
          <Content.Options>{props.options}</Content.Options>
        </Content.Title>
        <Tabs default="Data">
          <Tabs.Pane name="Data">
            <DatasetDataTab
              dataset={props.dataset}
              datasetRef={props.datasetRef}
              documentsRef={props.documentsRef}
            />
          </Tabs.Pane>
          <Tabs.Pane name="Cluster">
            <DatasetClusterTab
              orgID={orgID}
              dataset={props.dataset}
              datasetRef={props.datasetRef}
              documentsRef={props.documentsRef}
              allHighlightsRef={props.allHighlightsRef}
            />
          </Tabs.Pane>
        </Tabs>
      </Content>
    </>
  );
}
