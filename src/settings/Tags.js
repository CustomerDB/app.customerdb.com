import React, { useContext, useState, useEffect, useRef } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import Col from "react-bootstrap/Col";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";
import { GithubPicker } from "react-color";

import { XCircleFill } from "react-bootstrap-icons";

import { useNavigate, useParams } from "react-router-dom";

import colorPair, { getTextColorForBackground } from "../color.js";

import List from "../List.js";
import Options from "../Options.js";

export default function Tags(props) {
  const auth = useContext(UserAuthContext);
  const navigate = useNavigate();
  const { orgID, tagGroupID } = useParams();
  const [tagGroups, setTagGroups] = useState([]);

  useEffect(() => {
    return props.tagGroupsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newTagGroups = [];

        snapshot.forEach((doc) => {
          let data = doc.data();

          data["ID"] = doc.id;
          newTagGroups.push(data);
        });

        setTagGroups(newTagGroups);
      });
  }, []);

  const onAdd = () => {
    props.tagGroupsRef.add({
      name: "New tag set",
      createdBy: auth.oauthClaims.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: "",
    });
  };

  const onClick = (ID) => {
    navigate(`/orgs/${orgID}/settings/tags/${ID}`);
  };

  const itemLoad = (index) => {
    return tagGroups[index];
  };

  const onRename = (ID, newName) => {
    props.tagGroupsRef.doc(ID).set(
      {
        name: newName,
      },
      { merge: true }
    );
  };

  const onDelete = (ID) => {
    props.tagGroupsRef.doc(ID).update({
      deletedBy: auth.oauthClaims.email,
      deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
    });

    if (tagGroupID === ID) {
      navigate("..");
    }
  };

  const [modalTagGroup, setModalTagGroup] = useState(undefined);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  let options = [
    {
      name: "Rename",
      onClick: (item) => {
        setModalTagGroup(item);
        setShowRenameModal(true);
      },
    },
    {
      name: "Delete",
      onClick: (item) => {
        setModalTagGroup(item);
        setShowDeleteModal(true);
      },
    },
  ];

  console.log("tagGroups in render", tagGroups);

  let view;
  if (tagGroupID !== undefined) {
    let tagGroupRef = props.tagGroupsRef.doc(tagGroupID);
    view = (
      <TagGroup key={tagGroupID} tagGroupRef={tagGroupRef} options={options} />
    );
  }

  return (
    <>
      <Col md={4} className="d-flex flex-column h-100">
        <List
          name="Tag groups"
          currentID={tagGroupID}
          itemLoad={itemLoad}
          itemCount={tagGroups.length}
          onAdd={onAdd}
          options={options}
          onClick={onClick}
        />
      </Col>
      <Col md={4}>{view}</Col>
      <RenameModal
        show={showRenameModal}
        tagGroup={modalTagGroup}
        onRename={onRename}
        onHide={() => {
          setShowRenameModal(false);
        }}
      />
      <DeleteModal
        show={showDeleteModal}
        tagGroup={modalTagGroup}
        onDelete={onDelete}
        onHide={() => {
          setShowDeleteModal(false);
        }}
      />
    </>
  );
}

function TagGroup(props) {
  const auth = useContext(UserAuthContext);
  const [tagGroup, setTagGroup] = useState();
  const [tags, setTags] = useState([]);

  const [tagNames, setTagNames] = useState({});

  useEffect(() => {
    let unsubscribe = props.tagGroupRef.onSnapshot((doc) => {
      let data = doc.data();
      data["ID"] = doc.id;
      setTagGroup(data);
    });
    return unsubscribe;
  }, [props.tagGroupRef]);

  useEffect(() => {
    let unsubscribe = props.tagGroupRef
      .collection("tags")
      .orderBy("creationTimestamp", "asc")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = [];
        let newTagNames = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data["ID"] = doc.id;
          newTags.push(data);

          newTagNames[data.ID] = data.name;
        });

        console.log("newTags");
        setTags(newTags);
        setTagNames(newTagNames);
      });
    return unsubscribe;
  }, []);

  const onAdd = () => {
    let color = colorPair();
    props.tagGroupRef.collection("tags").doc().set({
      name: "Untitled tag",
      color: color.background,
      textColor: color.foreground,
      createdBy: auth.oauthClaims.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      deletionTimestamp: "",
    });
  };

  const checkReturn = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  if (props.tagGroupRef === undefined || tagGroup === undefined) {
    console.log(props);
    return <></>;
  }

  return (
    <>
      <Row style={{ paddingBottom: "2rem" }}>
        <Col className="d-flex align-self-center">
          <h3 className="my-auto">{tagGroup.name}</h3>
          <Button variant="link">
            <Options item={tagGroup} options={props.options} />
          </Button>
        </Col>
      </Row>
      {tags.map((tag) => {
        return (
          <Row className="mb-2" key={tag.ID}>
            <Col md={12}>
              <Row noGutters={true}>
                <Col md={11} className="d-flex">
                  <ColorPicker tag={tag} tagGroupRef={props.tagGroupRef} />
                  <Form.Control
                    type="text"
                    placeholder="Name"
                    value={tagNames[tag.ID]}
                    onChange={(e) => {
                      let tn = {};
                      Object.assign(tn, tagNames);
                      tn[tag.ID] = e.target.value;
                      setTagNames(tn);
                    }}
                    onBlur={(e) => {
                      if (tagNames[tag.ID] === undefined) {
                        return;
                      }

                      props.tagGroupRef.collection("tags").doc(tag.ID).set(
                        {
                          name: tagNames[tag.ID],
                        },
                        { merge: true }
                      );
                    }}
                    onKeyDown={checkReturn}
                  />
                </Col>
                <Col md={1} style={{ padding: 0 }}>
                  <Button variant="link">
                    <XCircleFill
                      color="grey"
                      onClick={() => {
                        props.tagGroupRef.collection("tags").doc(tag.ID).set(
                          {
                            deletedBy: auth.oauthClaims.email,
                            deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                          },
                          { merge: true }
                        );
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
            onClick={onAdd}
          >
            +
          </Button>
        </Col>
      </Row>
    </>
  );
}

function ColorPicker(props) {
  const ref = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState();

  useEffect(() => {
    const handleClose = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
    };
  }, [ref]);

  return (
    <div ref={ref}>
      <div
        style={{
          background: props.tag.color,
          width: "25px",
          height: "100%",
          borderRadius: "0.25rem",
        }}
        onClick={(e) => {
          setColorPickerOpen(true);
        }}
      >
        {}
      </div>
      {colorPickerOpen ? (
        <div style={{ position: "absolute", zIndex: 2 }}>
          <GithubPicker
            color={props.tag.color}
            onChangeComplete={(color) => {
              props.tagGroupRef
                .collection("tags")
                .doc(props.tag.ID)
                .set(
                  {
                    color: color.hex,
                    textColor: getTextColorForBackground(color.hex),
                  },
                  { merge: true }
                );

              setColorPickerOpen(false);
            }}
          />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

function RenameModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.tagGroup !== undefined) {
      setName(props.tagGroup.name);
    }
  }, [props.tagGroup]);

  const onSubmit = () => {
    props.onRename(props.tagGroup.ID, name);
    props.onHide();
  };

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Rename tag group</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          type="text"
          defaultValue={name}
          onChange={(e) => {
            setName(e.target.value);
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
          Rename
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function DeleteModal(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.tagGroup !== undefined) {
      setName(props.tagGroup.name);
    }
  }, [props.tagGroup]);

  return (
    <Modal show={props.show} onHide={props.onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete tag group</Modal.Title>
      </Modal.Header>
      <Modal.Body>Are you sure you want to delete {name}?</Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={() => {
            props.onDelete(props.tagGroup.ID);
            props.onHide();
          }}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}