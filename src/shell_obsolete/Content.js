import React from "react";

import FocusContext from "../util/FocusContext.js";

import Col from "react-bootstrap/Col";

export default class Content extends React.Component {
  static contextType = FocusContext;

  static Title(props) {
    return <div className="pb-3 d-flex">{props.children}</div>;
  }

  static Name(props) {
    return (
      <div>
        <h3>{props.children}</h3>
      </div>
    );
  }

  static Options(props) {
    return <div>{props.children}</div>;
  }

  static Content(props) {
    return (
      <Col className={`h-100 ${props.className ? props.className : ""}`} md={9}>
        {props.children}
      </Col>
    );
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
