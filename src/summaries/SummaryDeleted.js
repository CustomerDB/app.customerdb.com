import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Moment from "react-moment";
import React from "react";
import Row from "react-bootstrap/Row";

export default function SummaryDeleted({ summary }) {
  let relativeTime = undefined;
  if (summary.deletionTimestamp) {
    relativeTime = <Moment fromNow date={summary.deletionTimestamp.toDate()} />;
  }

  return (
    <Container>
      <Row noGutters={true}>
        <Col>
          <h3>{summary.name}</h3>
        </Col>
      </Row>
      <Row noGutters={true}>
        <Col>
          <p>
            This summary was deleted {relativeTime} by {summary.deletedBy}
          </p>
        </Col>
      </Row>
    </Container>
  );
}
