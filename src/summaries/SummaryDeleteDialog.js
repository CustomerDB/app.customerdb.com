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

import "firebase/firestore";

import * as firebaseClient from "firebase/app";

import React, { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function SummaryDeleteDialog({ open, setOpen, summary }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { summariesRef } = useFirestore();
  const navigate = useNavigate();

  const cancel = () => {
    setOpen(false);
  };

  const archive = () => {
    if (
      !summariesRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !summary ||
      !summary.ID
    ) {
      setOpen(false);
      return;
    }

    event(firebase, "delete_summary", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    summariesRef
      .doc(summary.ID)
      .update({
        deletedBy: oauthClaims.email,
        deletionTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        navigate(`/orgs/${orgID}/summaries`);
        setOpen(false);
      });
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this summary?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this summary for deletion. This summary will no longer be visible
          and will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
          id="archive-summary-dialog-button"
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
