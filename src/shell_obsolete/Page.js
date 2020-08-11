import React from "react";

import Row from "react-bootstrap/Row";

export default class Page extends React.Component {
  render() {
    return (
      <Row className="flex-grow-1 h-100" noGutters={true}>
        {this.props.children}
      </Row>
    );
  }
}
