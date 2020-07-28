import React from "react";

import Row from "react-bootstrap/Row";
import Container from "react-bootstrap/Container";

export default class Page extends React.Component {
  render() {
    return (
      <div className="flex-grow-1 h-100">
        <Container className="h-100" fluid>
          <Row className="h-100" noGutters={true}>
            {this.props.children}
          </Row>
        </Container>
      </div>
    );
  }
}
