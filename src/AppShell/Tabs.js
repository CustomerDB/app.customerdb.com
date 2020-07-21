import React from "react";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import BootstrapTab from "react-bootstrap/Tab";
import BootstrapTabs from "react-bootstrap/Tabs";

export default class Tabs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      key: undefined,
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
      <Col className="h-100" md={8}>
        {props.children}
      </Col>
    );
  }

  static SidePane(props) {
    return (
      <Col className="h-100" md={4}>
        {props.children}
      </Col>
    );
  }

  render() {
    return (
      <BootstrapTabs
        activeKey={this.state.key}
        onSelect={(k) => this.setState({ key: k })}
        variant="pills"
      >
        {this.props.children.map((pane) => (
          <BootstrapTab eventKey={pane.props.name} title={pane.props.name}>
            {pane}
          </BootstrapTab>
        ))}
      </BootstrapTabs>
    );
  }
}
