// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
