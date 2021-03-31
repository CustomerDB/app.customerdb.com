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

import React, { useContext, useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Col from "react-bootstrap/Col";
import FirebaseContext from "../util/FirebaseContext.js";
import Form from "react-bootstrap/Form";
import Grid from "@material-ui/core/Grid";
import Modal from "../shell_obsolete/Modal.js";
import Row from "react-bootstrap/Row";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  fullWidthCard: {
    margin: "1rem",
    padding: "1rem 2rem",
    minHeight: "24rem",
    width: "100%",
    maxWidth: "80rem",
  },
});

export default function Admin(props) {
  const [show, setShow] = useState();
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [organizations, setOrganizations] = useState();

  const firebase = useContext(FirebaseContext);

  const classes = useStyles();

  const createOrganization = firebase
    .functions()
    .httpsCallable("organizations-createOrganization");

  useEffect(() => {
    return firebase
      .firestore()
      .collection("organizations")
      .onSnapshot((snapshot) => {
        let newOrganizations = [];
        snapshot.forEach((organization) => {
          let orgData = organization.data();
          orgData.ID = organization.id;
          newOrganizations.push(orgData);
        });
        newOrganizations.sort();
        setOrganizations(newOrganizations);
      });
  });

  const createOrg = () => {
    console.debug(
      "Creating organization",
      createOrganization({ name: name, email: email })
    );
  };

  if (!organizations) {
    return <></>;
  }

  let organizationsTable = (
    <Table
      style={{ width: "100%", overflowX: "hidden" }}
      aria-label="organization members"
    >
      <TableHead>
        <TableRow>
          <TableCell align="left">ID</TableCell>
          <TableCell align="left">Name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {organizations.map((row) => (
          <TableRow key={row.ID}>
            <TableCell align="left">{row.ID}</TableCell>
            <TableCell align="left">{row.name}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      <Grid container justify="center">
        <Card className={classes.fullWidthCard}>
          <CardContent>
            <Grid item xs>
              {organizationsTable}
            </Grid>
          </CardContent>
          <CardActions>
            <Button
              onClick={() => {
                setShow(true);
              }}
            >
              Create organization
            </Button>
          </CardActions>
        </Card>
        <Modal
          name="New organization"
          show={show}
          onHide={() => setShow(false)}
          footer={[
            <Button
              key="createOrg"
              onClick={createOrg}
              variant="contained"
              color="secondary"
            >
              Create
            </Button>,
          ]}
        >
          <Row className="mb-3">
            <Col>
              <Form.Label>Organization name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Organization"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Label>Admin email address</Form.Label>
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </Col>
          </Row>
        </Modal>
      </Grid>
    </>
  );
}
