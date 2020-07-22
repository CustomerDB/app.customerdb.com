import React, { useContext, useEffect, useState } from "react";

import UserAuthContext from "./auth/UserAuthContext";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";
import Toast from "react-bootstrap/Toast";
import Table from "react-bootstrap/Table";
import Modal from "react-bootstrap/Modal";

import { useParams, useNavigate } from "react-router-dom";
import {
  Building,
  PersonCircle,
  Hdd,
  Diagram3,
  Tags as TagsIcon,
} from "react-bootstrap-icons";

import Options from "./Options.js";

import Tags from "./Tags.js";

import { AutoSizer, List as VirtList } from "react-virtualized";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);

  const { orgID } = useParams();
  const navigate = useNavigate();

  let list = [
    {
      name: "profile",
      title: "Profile",
      icon: <PersonCircle size={30} />,
      path: `/orgs/${orgID}/settings/`,
      content: (
        <Col md={8}>
          <Profile membersRef={props.membersRef} />
        </Col>
      ),
    },
  ];

  if (auth.oauthClaims.admin === true) {
    list.push({
      name: "members",
      title: "Members",
      icon: <Diagram3 size={30} />,
      path: `/orgs/${orgID}/settings/members`,
      content: (
        <Col md={8}>
          <Members membersRef={props.membersRef} />
        </Col>
      ),
    });

    list.push({
      name: "organization",
      title: "Organization",
      icon: <Building size={30} />,
      path: `/orgs/${orgID}/settings/organization`,
      content: (
        <Col md={8}>
          <Organization />
        </Col>
      ),
    });

    list.push({
      name: "backup",
      title: "Backup and restore",
      icon: <Hdd size={30} />,
      path: `/orgs/${orgID}/settings/backup`,
      content: (
        <Col md={8}>
          <Backup />
        </Col>
      ),
    });
  }

  list.push({
    name: "tags",
    title: "Tag management",
    icon: <TagsIcon size={30} />,
    path: `/orgs/${orgID}/settings/tags`,
    content: <Tags orgID={props.orgID} tagGroupsRef={props.tagGroupsRef} />,
  });

  const [view, setView] = useState();
  useEffect(() => {
    let listItem = list.find((item) => {
      return props.selected == item.name;
    });
    if (listItem !== undefined) {
      setView(listItem.content);
    }
  }, [props.selected]);

  const cardRenderer = ({ key, index, style }) => {
    let d = list[index];

    const onClick = () => {
      navigate(d.path);
    };

    let title = (
      <p className="listCardTitle" onClick={onClick}>
        {d.title}
      </p>
    );
    let listCardClass = "listCard";
    if (props.selected == d.name) {
      listCardClass = "listCardActive";
    }

    return (
      <Row key={key} style={style}>
        <Col>
          <Container className={listCardClass}>
            <Row className="h-100">
              <Col className="align-self-center" md={2}>
                {d.icon}
              </Col>
              <Col className="listTitleContainer align-self-center" md={8}>
                {title}
              </Col>
            </Row>
          </Container>
        </Col>
      </Row>
    );
  };

  return (
    <Container className="noMargin">
      <Row className="h-100">
        <Col md={4} className="d-flex flex-column h-100">
          <Row style={{ paddingBottom: "2rem" }}>
            <Col md={10} className="my-auto">
              <h3>Settings</h3>
            </Col>
          </Row>
          <Row className="flex-grow-1">
            <Col>
              <AutoSizer>
                {({ height, width }) => (
                  <VirtList
                    height={height}
                    rowCount={list.length}
                    rowHeight={window.getEmPixels() * 6}
                    rowRenderer={cardRenderer}
                    width={width}
                  />
                )}
              </AutoSizer>
            </Col>
          </Row>
        </Col>
        {view}
      </Row>
    </Container>
  );
}

function Profile(props) {
  const auth = useContext(UserAuthContext);
  const [displayName, setDisplayName] = useState();
  const [profile, setProfile] = useState();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let unsubscribe;
    if (props.membersRef !== undefined) {
      unsubscribe = props.membersRef
        .doc(auth.oauthClaims.email)
        .onSnapshot((doc) => {
          let data = doc.data();
          console.log("data", data);
          setDisplayName(data.displayName);
          setProfile(data);
        });
    }
    return unsubscribe;
  }, [props.membersRef]);

  const onSave = () => {
    profile.displayName = displayName;
    props.membersRef.doc(auth.oauthClaims.email).set(profile);
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
  const [members, setMembers] = useState();
  const [member, setMember] = useState();
  const [inviteModalShow, setInviteModalShow] = useState();
  const [deleteModalShow, setDeleteModalShow] = useState();

  useEffect(() => {
    let unsubscribe;
    if (props.membersRef !== undefined) {
      console.log("Profile :: useEffect");

      unsubscribe = props.membersRef.onSnapshot((query) => {
        let members = [];
        query.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          members.push(data);
        });

        setMembers(members);
      });
    }
    return unsubscribe;
  }, [props.membersRef]);

  const onInvite = (email) => {
    props.membersRef.doc(email).set({
      invited: true,
      active: false,
      email: email,
      inviteSentTimestamp: "",
    });
  };

  const onDelete = (email) => {
    props.membersRef.doc(email).delete();
  };

  const onRedact = (email) => {
    props.membersRef.doc(email).set(
      {
        invited: false,
      },
      { merge: true }
    );
  };
  const onActivate = (email) => {
    props.membersRef.doc(email).set(
      {
        active: true,
      },
      { merge: true }
    );
  };
  const onDisable = (email) => {
    props.membersRef.doc(email).set(
      {
        active: false,
      },
      { merge: true }
    );
  };
  const onUserToAdmin = (email) => {
    props.membersRef.doc(email).set(
      {
        admin: true,
      },
      { merge: true }
    );
  };
  const onAdminToUser = (email) => {
    props.membersRef.doc(email).set(
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
                      <tr>
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

function Organization(props) {
  return (
    <Container>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col>
          <h3>Organization</h3>
        </Col>
      </Row>
    </Container>
  );
}

function Backup(props) {
  return (
    <Container>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col>
          <h3>Backup and restore</h3>
        </Col>
      </Row>
    </Container>
  );
}
