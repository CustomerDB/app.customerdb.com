import React, { useEffect, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import Shell from "../shell_obsolete/Shell.js";
import Page from "../shell_obsolete/Page.js";
import Navigation from "../shell_obsolete/Navigation.js";

import List from "../shell_obsolete/List.js";
import Modal from "../shell_obsolete/Modal.js";

import { Globe } from "react-bootstrap-icons";

const createOrganization = window.firebase
  .functions()
  .httpsCallable("createOrganization");

export default function Admin(props) {
  const [show, setShow] = useState();
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [organizations, setOrganizations] = useState();

  useEffect(() => {
    return window.firebase
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

  return (
    <Shell>
      <Navigation>
        <Navigation.Top>
          <Navigation.Item
            name="Admin"
            icon={<Globe />}
            path="/admin"
            end={true}
          />
        </Navigation.Top>
      </Navigation>
      <Page>
        <List>
          <List.Title>
            <List.Name>Organizations</List.Name>
            <List.Add
              onClick={() => {
                setShow(true);
              }}
            />
          </List.Title>
          <List.Items>
            {organizations.map((item) => (
              <List.Item
                key={item.ID}
                name={
                  <span>
                    {item.name}
                    <br />
                    <a href={`https://app.customerdb.com/join/${item.ID}`}>
                      Join Link
                    </a>
                  </span>
                }
              />
            ))}
          </List.Items>
          <Modal
            name="New organization"
            show={show}
            onHide={() => setShow(false)}
            footer={[
              <Button key="createOrg" onClick={createOrg}>
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
        </List>
      </Page>
    </Shell>
  );
}
