import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import Modal from "../shell_obsolete/Modal.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import { XCircleFill } from "react-bootstrap-icons";

import { nanoid } from "nanoid";

export default function PersonEditModal(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const [person, setPerson] = useState();
  const [name, setName] = useState();
  const [email, setEmail] = useState();
  const [company, setCompany] = useState();
  const [job, setJob] = useState();
  const [phone, setPhone] = useState();
  const [country, setCountry] = useState();
  const [state, setState] = useState();
  const [city, setCity] = useState();

  const [customFields, setCustomFields] = useState({});
  const [labels, setLabels] = useState({});

  useEffect(() => {
    if (!props.personRef) {
      return;
    }

    props.personRef.get().then((doc) => {
      let person = doc.data();
      person.ID = doc.id;

      setName(person.name);
      setEmail(person.email);
      setCompany(person.company);
      setJob(person.job);
      setPhone(person.phone);
      setCountry(person.country);
      setState(person.state);
      setCity(person.city);

      setCustomFields(person.customFields || {});
      setLabels(person.labels || {});

      setPerson(person);
    });
  }, [props.show, props.personRef]);

  if (!person) {
    return <></>;
  }

  const addCustomField = () => {
    let ID = nanoid();
    let fields = {};
    Object.assign(fields, customFields);
    fields[ID] = { ID: ID, kind: "", value: "" };
    setCustomFields(fields);
  };

  const addLabel = () => {
    let ID = nanoid();
    let l = {};
    Object.assign(l, labels);
    l[ID] = { ID: ID, kind: "" };
    setLabels(l);
  };

  let fields = [
    {
      label: "Full name",
      placeholder: "Name",
      type: "text",
      value: name,
      setter: setName,
    },
    {
      label: "Email address",
      placeholder: "Email",
      type: "email",
      value: email,
      setter: setEmail,
    },
    {
      label: "Company name",
      placeholder: "Company",
      type: "text",
      value: company,
      setter: setCompany,
    },
    {
      label: "Job title",
      placeholder: "Job",
      type: "text",
      value: job,
      setter: setJob,
    },
    {
      label: "Phone number",
      placeholder: "Phone",
      type: "text",
      value: phone,
      setter: setPhone,
    },
    {
      label: "Country",
      placeholder: "Country",
      type: "text",
      value: country,
      setter: setCountry,
    },
    {
      label: "State",
      placeholder: "State",
      type: "text",
      value: state,
      setter: setState,
    },
    {
      label: "City",
      placeholder: "City",
      type: "text",
      value: city,
      setter: setCity,
    },
  ];

  return (
    <Modal
      show={props.show}
      onHide={props.onHide}
      name="Edit person"
      footer={[
        <Button
          key={person.ID}
          onClick={() => {
            event("edit_person", {
              orgID: oauthClaims.orgID,
              userID: oauthClaims.user_id,
            });

            if (name) person.name = name;
            if (email) person.email = email;
            if (company) person.company = company;
            if (job) person.job = job;
            if (phone) person.phone = phone;
            if (country) person.country = country;
            if (state) person.state = state;
            if (city) person.city = city;

            person.customFields = customFields;
            person.labels = labels;

            props.personRef.set(person);
          }}
        >
          Save
        </Button>,
      ]}
    >
      {fields.map((field) => (
        <Row className="mb-3" key={field.label}>
          <Col>
            <Form.Label>{field.label}</Form.Label>
            <Form.Control
              type={field.type}
              placeholder={field.placeholder}
              value={field.value}
              onChange={(e) => {
                field.setter(e.target.value);
              }}
            />
          </Col>
        </Row>
      ))}

      <Row>
        <Col>
          <Form.Label>Other details</Form.Label>
        </Col>
      </Row>
      {Object.values(customFields).map((field) => {
        return (
          <Row className="mb-2" key={field.ID}>
            <Col>
              <Row>
                <Col md={4}>
                  <Form.Control
                    type="text"
                    placeholder="Kind"
                    defaultValue={field.kind}
                    onChange={(e) => {
                      let fields = {};
                      Object.assign(fields, customFields);
                      fields[field.ID].kind = e.target.value;
                      setCustomFields(fields);
                    }}
                  />
                </Col>
                <Col md={7}>
                  <Form.Control
                    type="text"
                    placeholder="Value"
                    defaultValue={field.value}
                    onChange={(e) => {
                      let fields = {};
                      Object.assign(fields, customFields);
                      fields[field.ID].value = e.target.value;
                      setCustomFields(fields);
                    }}
                  />
                </Col>
                <Col md={1} style={{ padding: 0 }}>
                  <Button variant="link">
                    <XCircleFill
                      color="grey"
                      onClick={() => {
                        let fields = {};
                        Object.assign(fields, customFields);
                        delete fields[field.ID];
                        setCustomFields(fields);
                      }}
                    />
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        );
      })}
      <Row className="mb-3">
        <Col>
          <Button
            className="addButton"
            style={{ width: "1.5rem", height: "1.5rem", fontSize: "0.75rem" }}
            onClick={addCustomField}
          >
            +
          </Button>
        </Col>
      </Row>
      <Row>
        <Col>
          <Form.Label>Labels</Form.Label>
        </Col>
      </Row>
      {Object.values(labels).map((label) => {
        return (
          <Row className="mb-2" key={label.ID}>
            <Col>
              <Row>
                <Col md={8}>
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    defaultValue={label.name}
                    onChange={(e) => {
                      let l = {};
                      Object.assign(l, labels);
                      l[label.ID].name = e.target.value;
                      // setLabels(l);
                    }}
                  />
                </Col>
                <Col md={1} style={{ padding: 0 }}>
                  <Button variant="link">
                    <XCircleFill
                      color="grey"
                      onClick={() => {
                        let l = {};
                        Object.assign(l, labels);
                        delete l[label.ID];
                        // setLabels(l);
                      }}
                    />
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        );
      })}
      <Row>
        <Col>
          <Button
            className="addButton"
            style={{ width: "1.5rem", height: "1.5rem", fontSize: "0.75rem" }}
            onClick={addLabel}
          >
            +
          </Button>
        </Col>
      </Row>
    </Modal>
  );
}
