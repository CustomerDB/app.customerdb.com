import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "react-bootstrap/Button";
import FirebaseContext from "../util/FirebaseContext.js";
import Modal from "../shell_obsolete/Modal.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";

export default function BoardDeleteModal({ boardRef, board, show, onHide }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const navigate = useNavigate();
  const { orgID } = useParams();

  if (!board) {
    return <></>;
  }

  return (
    <Modal
      name="Archive board"
      show={show}
      onHide={onHide}
      footer={[
        <Button
          key={board.ID}
          onClick={() => {
            event(firebase, "archive_board", {
              orgID: orgID,
              userID: oauthClaims.user_id,
            });

            boardRef.update({
              deletedBy: oauthClaims.email,
              deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });

            navigate(`/orgs/${orgID}/boards`);
          }}
        >
          Archive
        </Button>,
      ]}
    >
      <p>
        Do you want to archive <b>{board.name}</b>?
      </p>
    </Modal>
  );
}
