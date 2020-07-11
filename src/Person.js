import React, { useState, useEffect } from 'react';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Tab from 'react-bootstrap/Tab';
import Button from 'react-bootstrap/Button';

import Options from './Options.js';

export default function Person(props) {
    const [person, setPerson] = useState(undefined);

    useEffect(() => {
        let unsubscribe = props.peopleRef.doc(props.personID).onSnapshot((doc) => {
            let data = doc.data();
            data['ID'] = doc.id;
            setPerson(data);
        });
        return unsubscribe;
    }, [props.personID]);

    if (person === undefined) {
      return <></>;
    }

    let fields = [
      {title: 'Email', value: person.email},
      {title: 'Company', value: person.company},
      {title: 'Job', value: person.job},
      {title: 'Phone', value: person.phone},
      {title: 'Country', value: person.country},
      {title: 'State', value: person.state},
      {title: 'City', value: person.city}
    ]

    let contactFields = fields.flatMap((e) => {
      console.log(person, e.title, e.value);
      if (e.value === undefined) {
        return [];
      }

      return [<Row className="mb-3"><Col><p style={{margin: 0}}><small>{e.title}</small></p><p><large>{e.value}</large></p></Col></Row>];
    })

    if (contactFields.length === 0) {
      contactFields.push(<p>A summary will be ready once you add data to this contact. Click here to get started.</p>);
    }

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
                    {contactFields}
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

