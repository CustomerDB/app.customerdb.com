import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import BootstrapTab from "react-bootstrap/Tab";
import BootstrapTabs from "react-bootstrap/Tabs";
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
      <Row className="h-100 pt-3" noGutters={true}>
        {props.children}
      </Row>
    );
  }

  static Content(props) {
    return (
      <Col className="h-100" md={9}>
        {props.children}
      </Col>
    );
  }

  static SidePane(props) {
    return (
      <Col className="h-100" md={3}>
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

    let buttons = children.map((child) => (
      <Button
        key={child.props.name}
        variant={child.props.name == this.state.key ? "primary" : "link"}
        onClick={() => {
          this.setState({ key: child.props.name });
        }}
      >
        {child.props.name}
      </Button>
    ));

    let page = children.filter((child) => child.props.name == this.state.key);

    return (
      <>
        <Row noGutters={true}>
          <Col>{buttons}</Col>
        </Row>
        <Row className="h-100 p-3" noGutters={true}>
          {page[0].props.children}
        </Row>
      </>
    );
  }
}
