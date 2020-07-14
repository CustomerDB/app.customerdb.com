import React from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';

import { AutoSizer } from 'react-virtualized';

import DatasetData from './DatasetData.js';
import DatasetClusterTab from './DatasetClusterTab.js';
import Options from './Options.js';

export default function Dataset(props) {

  // Give a hint if this dataset was deleted while in view.
  if (props.dataset.deletionTimestamp !== "") {
    let date = this.state.deletionTimestamp.toDate();

    return <Container>
    <Row>
      <Col>
        <h3 className="my-auto">{props.dataset.name}</h3>
      </Col>
    </Row>
    <Row>
      <Col>
        <p>This dataset was deleted at {date.toString()} by {props.dataset.deletedBy}</p>
      </Col>
    </Row>
    </Container>;
  }

  return <>
    <Row style={{paddingBottom: "2rem"}}>
      <Col className="d-flex align-self-center">
        <h3 className="my-auto">{props.dataset.name}</h3>
        <Button variant="link">
            <Options item={props.dataset} options={props.options}/>
        </Button>
      </Col>
    </Row>

    <Tab.Container id="documentTabs" defaultActiveKey="data">
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
          {({height, width}) => (
            <Col>
              <Tab.Content style={{height: height, width: width, overflowY: "auto"}}>

                <Tab.Pane eventKey="data">
                  <Container>
                    <DatasetData dataset={props.dataset} />
                  </Container>
                </Tab.Pane>

                <Tab.Pane eventKey="cluster">
                  <Container>
                    <DatasetClusterTab
                      dataset={props.dataset}
                      datasetRef={props.datasetRef}
                      allHighlightsRef={props.allHighlightsRef} />
                  </Container>
                </Tab.Pane>

              </Tab.Content>
            </Col>
          )}
        </AutoSizer>
      </Row>
    </Tab.Container>
  </>;
}
