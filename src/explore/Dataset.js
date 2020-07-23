import React from "react";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";

import { useParams, useNavigate, Navigate } from "react-router-dom";

import { AutoSizer } from "react-virtualized";

import DatasetData from "./DatasetData.js";
import DatasetClusterTab from "./DatasetClusterTab.js";
import Options from "../Options.js";

export default function Dataset(props) {
  let { orgID, datasetID, tabID } = useParams();
  let navigate = useNavigate();

  // Give a hint if this dataset was deleted while in view.
  if (props.dataset.deletionTimestamp !== "") {
    let date = this.state.deletionTimestamp.toDate();

    return (
      <Container>
        <Row>
          <Col>
            <h3 className="my-auto">{props.dataset.name}</h3>
          </Col>
        </Row>
        <Row>
          <Col>
            <p>
              This dataset was deleted at {date.toString()} by{" "}
              {props.dataset.deletedBy}
            </p>
          </Col>
        </Row>
      </Container>
    );
  }

  let tabPanes = {
    data: (
      <Tab.Pane eventKey="data">
        <DatasetData
          dataset={props.dataset}
          datasetRef={props.datasetRef}
          documentsRef={props.documentsRef}
        />
      </Tab.Pane>
    ),

    cluster: (
      <Tab.Pane eventKey="cluster" className="fullHeight">
        <DatasetClusterTab
          orgID={orgID}
          dataset={props.dataset}
          datasetRef={props.datasetRef}
          documentsRef={props.documentsRef}
          allHighlightsRef={props.allHighlightsRef}
        />
      </Tab.Pane>
    ),
  };

  if (tabID && !(tabID in tabPanes)) {
    return <Navigate to="/404" />;
  }

  let activeTab = tabID || "data";

  const onTabClick = (key) => {
    navigate(`/orgs/${orgID}/explore/${datasetID}/${key}`);
  };

  return (
    <>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col className="d-flex align-self-center">
          <h3 className="my-auto">{props.dataset.name}</h3>
          {props.options}
        </Col>
      </Row>

      <Tab.Container
        id="documentTabs"
        activeKey={activeTab}
        onSelect={onTabClick}
      >
        <Row>
          <Col>
            <Nav variant="pills">
              <Nav.Item key="data">
                <Nav.Link eventKey="data">Data</Nav.Link>
              </Nav.Item>
              <Nav.Item key="cluster">
                <Nav.Link eventKey="cluster">Cluster</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>

        <Row className="flex-grow-1">
          <AutoSizer>
            {({ height, width }) => (
              <Col>
                <Tab.Content
                  style={{ height: height, width: width, overflowY: "auto" }}
                >
                  {Object.values(tabPanes)}
                </Tab.Content>
              </Col>
            )}
          </AutoSizer>
        </Row>
      </Tab.Container>
    </>
  );
}
