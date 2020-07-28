import React, { useEffect, useState } from "react";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import Shell from "../shell/Shell.js";
import Page from "../shell/Page.js";
import Content from "../shell/Content.js";
import Navigation from "../shell/Navigation.js";

import List from "../shell/List.js";
import Modal from "../shell/Modal.js";

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
    window.firebase
      .firestore()
      .collection("organizations")
      .onSnapshot((snapshot) => {
        let newOrganizations = [];
        snapshot.forEach((organization) => {
          newOrganizations.push(organization.data());
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
              <List.Item name={item.name} />
            ))}
          </List.Items>
          <Modal
            name="New organization"
            show={show}
            onHide={() => setShow(false)}
            footer={[<Button onClick={createOrg}>Create</Button>]}
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
        <Content></Content>
      </Page>
    </Shell>
  );
}
