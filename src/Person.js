import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

import Options from './Options.js';

export default function Person(props) {
    const [person, setPerson] = useState("");

    useEffect(() => {
        let unsubscribe = props.peopleRef.doc(props.personID).onSnapshot((doc) => {
            let data = doc.data();
            data['ID'] = doc.id;
            setPerson(data);
        });
        return unsubscribe;
    }, []);

    return <><Container>
    <Row style={{paddingBottom: "2rem"}}>
      <Col className="d-flex align-self-center">
        <h3 className="my-auto">{person.name}</h3>
        <Button variant="link">
            <Options item={person} options={props.options}/>
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
    </Container></>;
}

