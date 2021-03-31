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

import React, { useRef, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import Link from "@material-ui/core/Link";
import MuiAlert from "@material-ui/lab/Alert";
import Snackbar from "@material-ui/core/Snackbar";

const Alert = (props) => {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
};

export default function CallDetailsDialog({ open, setOpen, link, token }) {
  const inviteTextRef = useRef();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  if (!link) return <></>;

  const copyInvite = () => {
    let node = inviteTextRef.current;
    if (!node) {
      return;
    }
    let inviteText = node.textContent.toString();
    navigator.clipboard.writeText(inviteText);
    setSnackbarOpen(true);
    setOpen(false);
  };

  const onSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const linkWithToken = `${link}?token=${token}`;

  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{`Call Details`}</DialogTitle>
        <DialogContent>
          <DialogContentText ref={inviteTextRef} id="alert-dialog-description">
            Join call with CustomerDB:{" "}
            <Link href={linkWithToken}>{linkWithToken}</Link>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<FileCopyOutlinedIcon />} onClick={copyInvite}>
            Copy to clipboard
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={onSnackbarClose}
      >
        <Alert onClose={onSnackbarClose} severity="success">
          Copied call details!
        </Alert>
      </Snackbar>
    </>
  );
}
