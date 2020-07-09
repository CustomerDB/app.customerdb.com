import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import Button from 'react-bootstrap/Button';


import { ThreeDotsVertical } from 'react-bootstrap-icons';

export default function Person(props) {
    const [name, setName] = useState("");

    useEffect(() => {
        let unsubscribe = props.peopleRef.doc(props.personID).onSnapshot((doc) => {
            let data = doc.data();
            setName(data.name);
        });
    }, []);

    return <Container>
    <Row style={{paddingBottom: "2rem"}}>
      <Col className="d-flex align-self-center">
        <h3 className="my-auto">{name}</h3>
        <Button variant="link">
            <ThreeDotsVertical/>
        </Button>
      </Col>
    </Row>
    <Tab.Container id="personTabs" defaultActiveKey="summary">
    <Row>
    <Col>
      <Nav variant="pills">
        <Nav.Item>
          <Nav.Link eventKey="summary">Summary</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="sources">Sources</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="sources">Segment</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="details">Details</Nav.Link>
        </Nav.Item>
      </Nav>
    </Col>
    </Row>
    <Row>
        <Col className="p-3">
            <Tab.Content>
                <Tab.Pane eventKey="summary">
                    <p>A summary will be ready once you add data to this contact. Click here to get started.</p>
                </Tab.Pane>
                <Tab.Pane eventKey="sources">
                    <p>Sources they have been involved in</p>
                </Tab.Pane>
                <Tab.Pane eventKey="details">
                    <p>Details about the person</p>
                </Tab.Pane>
            </Tab.Content>
        </Col>
    </Row>
    </Tab.Container>
    </Container>;
}