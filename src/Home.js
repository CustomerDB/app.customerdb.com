import React from 'react';

import { Link } from 'react-router-dom';

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';

export default function Home(props) {
  return <Container style={{marginTop: "3rem"}}>
    <Row>
      <h1>CustomerDB</h1>
    </Row>
    <Row>
      <Link to="/login">Login</Link>
    </Row>
  </Container>;
}
