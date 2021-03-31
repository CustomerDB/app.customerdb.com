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
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import UserAuthContext from "../auth/UserAuthContext.js";
import FirebaseContext from "../util/FirebaseContext.js";
import { useParams } from "react-router-dom";
import event from "../analytics/event.js";
import Button from "@material-ui/core/Button";

export default function TagGroupDeleteDialog({
  tagGroupRef,
  open,
  setOpen,
  tagGroup,
}) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();

  const cancel = () => {
    console.debug("user canceled tag group archive");
    setOpen(false);
  };

  const archive = () => {
    if (
      !tagGroupRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !tagGroup ||
      !tagGroup.ID
    ) {
      setOpen(false);
      return;
    }

    console.debug("archiving tag group");

    event(firebase, "delete_tag_group", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    tagGroupRef.update({
      deletedBy: oauthClaims.email,
      deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this tag group?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this tag group for deletion. This tag group will no longer be
          visible and will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
          onClick={archive}
          variant="contained"
          color="secondary"
          autoFocus
        >
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
