import React, { useContext } from "react";

import FocusContext from "../util/FocusContext.js";

import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export default class Content extends React.Component {
  static contextType = FocusContext;

  static Title(props) {
    return (
      <Row className="pb-3" noGutters={true}>
        {props.children}
      </Row>
    );
  }

  static Name(props) {
    return (
      <Col>
        <h3>{props.children}</h3>
      </Col>
    );
  }

  static Options(props) {
    return <Col>{props.children}</Col>;
  }

  render() {
    const shouldExpand = this.context.focus;
    return (
      <Col md={shouldExpand ? 12 : 9} className="pt-4 pl-4 d-flex flex-column">
        {this.props.children}
      </Col>
    );
  }
}
