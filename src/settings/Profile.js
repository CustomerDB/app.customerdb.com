import React, { useContext, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext";
import useFirestore from "../db/Firestore.js";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Toast from "react-bootstrap/Toast";
import Image from "react-bootstrap/Image";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";

export default function Profile(props) {
  const auth = useContext(UserAuthContext);
  const { membersRef } = useFirestore();
  const [displayName, setDisplayName] = useState();
  const [profile, setProfile] = useState();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!membersRef) {
      return;
    }

    let unsubscribe = membersRef
      .doc(auth.oauthClaims.email)
      .onSnapshot((doc) => {
        let data = doc.data();
        console.log("data", data);
        setDisplayName(data.displayName);
        setProfile(data);
      });
    return unsubscribe;
  }, [auth.oauthClaims.email, membersRef]);

  const onSave = () => {
    profile.displayName = displayName;
    membersRef.doc(auth.oauthClaims.email).set(profile);
    setShow(true);
  };

  return (
    <>
      <Container>
        <Row style={{ paddingBottom: "2rem" }}>
          <Col>
            <h3>Profile</h3>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Label>Photo</Form.Label>
            <br />
            <Image
              style={{ width: "10rem" }}
              src={auth.oauthClaims.picture}
              roundedCircle
              alt="..."
            />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Label>Email</Form.Label>
            <br />
            <p>{auth.oauthClaims.email}</p>
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Name"
              defaultValue={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
              }}
            />
          </Col>
        </Row>
        <Row className="mb-3">
          <Col>
            <Button className="float-right" onClick={onSave}>
              Save
            </Button>
          </Col>
        </Row>
        <Row className="mt-3">
          <Button
            variant="link"
            onClick={() => window.displayPreferenceModal()}
          >
            Manage Cookie Preferences
          </Button>
        </Row>
      </Container>

      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
        }}
      >
        <Toast onClose={() => setShow(false)} show={show} delay={3000} autohide>
          <Toast.Header>
            <strong className="mr-auto"></strong>
            <small>just now</small>
          </Toast.Header>
          <Toast.Body>Saved profile details</Toast.Body>
        </Toast>
      </div>
    </>
  );
}
