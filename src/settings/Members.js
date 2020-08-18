import React, { useContext, useEffect, useState } from "react";

import event from "../analytics/event.js";
import UserAuthContext from "../auth/UserAuthContext";
import useFirestore from "../db/Firestore.js";

import InviteMemberModal from "./InviteMemberModal.js";
import DeleteMemberModal from "./DeleteMemberModal.js";

import Options from "../Options.js";

import { Routes, Route, Navigate, useParams } from "react-router-dom";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Image from "react-bootstrap/Image";

export default function Members(props) {
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
      <InviteMemberModal
        show={inviteModalShow}
        onInvite={onInvite}
        onHide={() => {
          setInviteModalShow(false);
        }}
      />
      <DeleteMemberModal
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
