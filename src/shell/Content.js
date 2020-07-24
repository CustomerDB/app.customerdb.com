import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

export default class Content extends React.Component {
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

  render() {
    return (
      <Col md={9} className="pt-4 pl-4 d-flex flex-column">
        {this.props.children}
      </Col>
    );
  }
}
