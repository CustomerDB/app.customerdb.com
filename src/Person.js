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
    <Tab.Container id="personTabs" defaultActiveKey="contact">
    <Row>
    <Col>
      <Nav variant="pills">
        <Nav.Item>
          <Nav.Link eventKey="contact">Contact</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="sources">Activity</Nav.Link>
        </Nav.Item>
      </Nav>
    </Col>
    </Row>
    <Row>
        <Col className="p-3">
            <Tab.Content>
                <Tab.Pane eventKey="contact">
                    <p>A summary will be ready once you add data to this contact. Click here to get started.</p>
                </Tab.Pane>
                <Tab.Pane eventKey="activity">
                    <p></p>
                </Tab.Pane>
            </Tab.Content>
        </Col>
    </Row>
    </Tab.Container>
    </Container>;
}