import React from "react";
import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import { useLocation, useNavigate } from "react-router-dom";

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
        <Button className="Add" onClick={props.onClick}>
          +
        </Button>
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
    const location = useLocation();
    const navigate = useNavigate();

    let isActive =
      props.path === location.pathname ||
      (!props.end && location.pathname.startsWith(props.path));

    let listClass = "ListItem";
    let options = props.options;
    if (isActive) {
      listClass += " Active";
      if (options) {
        options = React.cloneElement(options, {
          active: true,
        });
      }
    }

    return (
      <Row noGutters={true} className="pb-3">
        <Col
          className={listClass}
          onClick={(e) => {
            // FIXME: Avoid event propagation in a more robust way.
            let buttonElements = ["path", "svg", "BUTTON"];
            if (buttonElements.includes(e.target.nodeName)) {
              return;
            }
            if (props.path) {
              navigate(props.path);
            }
          }}
        >
          <Row noGutters={true} className="h-100 p-3">
            <Col className="align-self-center" ms={7} md={7} lg={9}>
              <p className="ListItemName">{props.name}</p>
            </Col>
            <Col className="align-self-center" md="auto">
              <div>{options}</div>
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
