import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import Button from "react-bootstrap/Button";

export default class Tabs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      key: this.props.default,
    };
  }

  static Pane(props) {
    return (
      <Row
        className={`h-100 pt-3 ${props.className ? props.className : ""}`}
        noGutters={true}
      >
        {props.children}
      </Row>
    );
  }

  static Content(props) {
    let md = "wide" in props ? 12 : 9;
    return (
      <Col
        className={`h-100 ${props.className ? props.className : ""}`}
        md={md}
      >
        {props.children}
      </Col>
    );
  }

  static SidePane(props) {
    return (
      <Col className={`h-100 ${props.className ? props.className : ""}`} md={3}>
        {props.children}
      </Col>
    );
  }

  static SidePaneCard(props) {
    return (
      <div className="SidePaneCard p-3 ml-3 mr-3 mb-3">{props.children}</div>
    );
  }

  render() {
    let children = this.props.children;
    if (!Array.isArray(children)) {
      children = [children];
    }

    let buttons = undefined;

    if (children.length > 1) {
      buttons = children.map((child) => (
        <Button
          key={child.key}
          variant={child.key === this.state.key ? "primary" : "link"}
          onClick={() => {
            this.setState({ key: child.key });
          }}
        >
          {child.props.name}
        </Button>
      ));
    }

    let page = children.filter((child) => child.key === this.state.key);

    return (
      <>
        <Row noGutters={true}>
          <Col>{buttons}</Col>
        </Row>
        <Row className="h-100 p-3" noGutters={true}>
          {page[0] && page[0].props.children}
        </Row>
      </>
    );
  }
}
