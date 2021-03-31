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

import React, { useContext } from "react";
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
