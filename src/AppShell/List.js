import React from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

export default class List extends React.Component {
  constructor(props) {
    super(props);
  }

  static Search(props) {
    return <></>;
  }

  static Title(props) {
    return <Row className="pb-3">{props.children}</Row>;
  }

  static Name(props) {
    return (
      <Col md={10}>
        <h3>{props.children}</h3>
      </Col>
    );
  }

  static Add(props) {
    return (
      <Col md={2}>
        <Button className="Add">+</Button>
      </Col>
    );
  }

  static Items(props) {
    return (
      <Row className="flex-grow-1" noGutters={true}>
        <Col className="h-100">{props.children}</Col>
      </Row>
    );
  }

  static Item(props) {
    return (
      <Row noGutters={true} className="pb-3">
        <Col
          className="ListItem"
          onClick={() => {
            console.log(`${props.name} clicked`);
          }}
        >
          <Row noGutters={true} className="h-100 p-3">
            <Col className="align-self-center" ms={7} md={7} lg={9}>
              <p className="ListItemName">{props.name}</p>
            </Col>
            <Col className="align-self-center" md="auto">
              <div>{props.options}</div>
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }

  render() {
    return (
      <Col md={3} className="pt-4">
        <Container className="d-flex flex-column h-100">
          {this.props.children}
        </Container>
      </Col>
    );
  }
}
