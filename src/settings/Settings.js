import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext";
import useFirestore from "../db/Firestore.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Scrollable from "../shell/Scrollable.js";
import Content from "../shell/Content.js";
import Options from "../Options.js";

import BulkImport from "./BulkImport.js";
import Tags from "./Tags.js";
import Templates from "./Templates.js";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Toast from "react-bootstrap/Toast";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";

import { Routes, Route, Navigate, useParams } from "react-router-dom";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);
  const { orgID } = useParams();

  let listItems = [
    <List.Item
      key="profile"
      name="Profile"
      path={`/orgs/${orgID}/settings/profile`}
    />,
    <List.Item
      key="tags"
      name="Tag setup"
      path={`/orgs/${orgID}/settings/tags`}
    />,
    <List.Item
      key="templates"
      name="Template setup"
      path={`/orgs/${orgID}/settings/templates`}
    />,
    <List.Item
      key="import"
      name="Bulk data import"
      path={`/orgs/${orgID}/settings/import`}
    />,
  ];

  if (auth.oauthClaims.admin === true) {
    listItems = listItems.concat([
      <List.Item
        key="members"
        name="Members"
        path={`/orgs/${orgID}/settings/members`}
      />,

      // TODO: reintroduce these unimplemented admin pages
      /*
      <List.Item
        key="organization"
        name="Organization"
        path={`/orgs/${orgID}/settings/organization`}
      />,
      <List.Item
        key="backup"
        name="Backup and restore"
        path={`/orgs/${orgID}/settings/backup`}
      />,
      */
    ]);
  }

  let adminRoutes = undefined;

  if (auth.oauthClaims.admin === true) {
    adminRoutes = [
      <Route key="members" path="members" element={<Members />} />,

      // TODO: Implement these settings pages... currently unused
      /*
      <Route
        key="organization"
        path="organization"
        element={<Organization selected="organization" />}
      />,
      <Route
        key="backup"
        path="backup"
        element={<Backup selected="backup" />}
      />,
      */
    ];
  }

  return (
    <Page>
      <List>
        <List.Title>
          <List.Name>Settings</List.Name>
        </List.Title>
        <List.Items>
          <Scrollable>{listItems}</Scrollable>
        </List.Items>
      </List>

      <Content>
        <Routes>
          <Route
            key="/"
            path="/"
            element={<Navigate to={`/orgs/${orgID}/settings/profile`} />}
          />

          <Route key="profile" path="profile" element={<Profile />} />

          <Route key="tags" path="tags">
            <Route key="tags" path="/" element={<Tags />} />
            <Route key=":tagGroupID" path=":tagGroupID" element={<Tags />} />
          </Route>

          <Route key="templates" path="templates">
            <Route key="templates" path="/" element={<Templates />} />
            <Route
              key=":templateID"
              path=":templateID"
              element={<Templates />}
            />
          </Route>

          <Route key="import" path="import" element={<BulkImport />} />

          {adminRoutes}

          <Route key="*" path="*" element={<Navigate to="/404" />} />
        </Routes>
      </Content>
    </Page>
  );
}

function Profile(props) {
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

function Members(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const { membersRef } = useFirestore();
  const [members, setMembers] = useState();
  const [member, setMember] = useState();
  const [inviteModalShow, setInviteModalShow] = useState();
  const [deleteModalShow, setDeleteModalShow] = useState();

  useEffect(() => {
    if (!membersRef) {
      return;
    }

    let unsubscribe = membersRef.onSnapshot((query) => {
      let members = [];
      query.forEach((doc) => {
        let data = doc.data();
        data.ID = doc.id;
        members.push(data);
      });

      setMembers(members);
    });
    return unsubscribe;
  }, [membersRef]);

  const onInvite = (email) => {
    event("invite_member", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    membersRef.doc(email).set({
      invited: true,
      active: false,
      email: email,
      inviteSentTimestamp: "",
    });
  };

  const onDelete = (email) => {
    membersRef.doc(email).delete();
  };

  const onRedact = (email) => {
    membersRef.doc(email).set(
      {
        invited: false,
      },
      { merge: true }
    );
  };
  const onActivate = (email) => {
    membersRef.doc(email).set(
      {
        active: true,
      },
      { merge: true }
    );
  };
  const onDisable = (email) => {
    membersRef.doc(email).set(
      {
        active: false,
      },
      { merge: true }
    );
  };
  const onUserToAdmin = (email) => {
    membersRef.doc(email).set(
      {
        admin: true,
      },
      { merge: true }
    );
  };
  const onAdminToUser = (email) => {
    membersRef.doc(email).set(
      {
        admin: false,
      },
      { merge: true }
    );
  };

  return (
    <>
      <Container>
        <Row style={{ paddingBottom: "2rem" }}>
          <Col>
            <h3>Members</h3>
          </Col>
        </Row>
        <Row>
          <Col>
            <Table>
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members !== undefined ? (
                  members.map((member) => {
                    let options = [];
                    let status;
                    if (member.invited) {
                      status = "Invited";
                      options.push({
                        name: "Redact invite",
                        onClick: (item) => {
                          onRedact(item.ID);
                        },
                      });
                    } else if (!member.active) {
                      status = "Inactive";
                      options.push({
                        name: "Activate",
                        onClick: (item) => {
                          onActivate(item.ID);
                        },
                      });
                    } else if (member.admin) {
                      status = "Administrator";

                      options.push({
                        name: "Disable account",
                        onClick: (item) => {
                          onDisable(item.ID);
                        },
                      });

                      options.push({
                        name: "Convert to member",
                        onClick: (item) => {
                          onAdminToUser(item.ID);
                        },
                      });
                    } else {
                      status = "Active";

                      options.push({
                        name: "Disable account",
                        onClick: (item) => {
                          onDisable(item.ID);
                        },
                      });

                      options.push({
                        name: "Convert to administrator",
                        onClick: (item) => {
                          onUserToAdmin(item.ID);
                        },
                      });
                    }

                    options.push({
                      name: "Delete",
                      onClick: (item) => {
                        setMember(item);
                        setDeleteModalShow(true);
                      },
                    });

                    return (
                      <tr key={member.uid}>
                        <td>
                          {member.photoURL !== undefined ? (
                            <Image
                              roundedCircle
                              className=""
                              src={member.photoURL}
                              alt="..."
                              style={{ width: "5rem" }}
                            />
                          ) : (
                            <></>
                          )}
                        </td>
                        <td>{member.displayName}</td>
                        <td>{member.email}</td>
                        <td>{status}</td>
                        <td>
                          <Options options={options} item={member} />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <></>
                )}
              </tbody>
            </Table>
            <Button
              className="float-right addButton"
              onClick={() => {
                setInviteModalShow(true);
              }}
            >
              +
            </Button>
          </Col>
        </Row>
      </Container>
      <InviteModal
        show={inviteModalShow}
        onInvite={onInvite}
        onHide={() => {
          setInviteModalShow(false);
        }}
      />
      <DeleteModal
        show={deleteModalShow}
        member={member}
        onDelete={onDelete}
        onHide={() => {
          setDeleteModalShow(false);
        }}
      />
    </>
  );
}

function InviteModal(props) {
  const [email, setEmail] = useState();

  const onSubmit = () => {
    props.onInvite(email);
    setEmail("");
    props.onHide();
  };

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Invite new team member</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Label>
          Email address of new team member. An invite will be sent by email with
          a link or they can join the organization here.
        </Form.Label>
        <Form.Control
          type="email"
          defaultValue={email}
          placeholder="Email"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onSubmit}>
          Send invite
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function DeleteModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.member !== undefined) {
      setName(props.member.displayName);
    }
  }, [props.member]);

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete contact</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        Are you sure you want to delete {name !== undefined ? name : "member"}?
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={() => {
            props.onDelete(props.member.email);
            props.onHide();
          }}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
