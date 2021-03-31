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

import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

export default function DeleteMemberDialog(props) {
  const [name, setName] = useState();

  useEffect(() => {
    if (props.member !== undefined) {
      setName(props.member.displayName);
    }
  }, [props.member]);

  return (
    <Dialog
      open={props.show}
      onClose={props.onHide}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this tag group?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Are you sure you want to delete{" "}
          <b>{name !== undefined ? name : "member"}</b>?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onHide} color="primary">
          Cancel
        </Button>
        <Button
          onClick={() => {
            props.onDelete(props.member.email);
            props.onHide();
          }}
          variant="contained"
          color="secondary"
          autoFocus
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
