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

import React, { useState, useContext, useEffect } from "react";
import { TextValidator, ValidatorForm } from "react-material-ui-form-validator";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import AddIcon from "@material-ui/icons/Add";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext";

export default function CreateOrg() {
  const [open, setOpen] = useState(false);
  const [firstOpened, setFirstOpened] = useState(false);

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();
  const { oauthClaims } = useContext(UserAuthContext);

  useEffect(() => {
    if (!db || !oauthClaims || !oauthClaims.email) {
      return;
    }

    return db
      .collectionGroup("members")
      .where("email", "==", oauthClaims.email)
      .onSnapshot((snapshot) => {
        if (snapshot.size === 0 && !firstOpened) {
          setOpen(true);
          setFirstOpened(true);
        }
      });
  }, [db, oauthClaims, firstOpened]);

  return (
    <>
      <Button
        onClick={(event) => {
          setOpen(true);
        }}
        startIcon={<AddIcon />}
        style={{
          borderRadius: "2rem",
          textTransform: "none",
          minWidth: "6rem",
        }}
        variant="contained"
        color="secondary"
      >
        Create
      </Button>
      <CreateOrgDialog open={open} setOpen={setOpen} />
    </>
  );
}

function MemberEmail({ onChange, value }) {
  return (
    <TextValidator
      autoComplete="username"
      variant="outlined"
      margin="normal"
      fullWidth
      label="Email"
      onChange={onChange}
      name="email"
      validators={["isEmail"]}
      errorMessages={["Not a valid email"]}
      value={value}
    />
  );
}

function CreateOrgDialog({ open, setOpen }) {
  const { oauthClaims } = useContext(UserAuthContext);

  const [name, setName] = useState();
  const [email1, setEmail1] = useState();
  const [email2, setEmail2] = useState();
  const [email3, setEmail3] = useState();
  const [email4, setEmail4] = useState();
  const [email5, setEmail5] = useState();

  const firebase = useContext(FirebaseContext);

  const db = firebase.firestore();
  let orgsRef = db.collection("organizations");

  const createOrg = () => {
    let teamEmails = [email1, email2, email3, email4, email5].flatMap((item) =>
      item ? [item] : []
    );

    orgsRef
      .add({
        name: name,
        adminEmail: oauthClaims.email,
        teamEmails: teamEmails,
        ready: false,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then(() => {
        setName();
        setEmail1();
        setEmail2();
        setEmail3();
        setEmail4();
        setEmail5();
        setOpen(false);
      });
  };

  const handleClose = () => {
    setName();
    setEmail1();
    setEmail2();
    setEmail3();
    setEmail4();
    setEmail5();
    setOpen(false);
  };

  return (
    <div>
      <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
        aria-labelledby="form-dialog-title"
      >
        <DialogTitle id="form-dialog-title">
          Create CustomerDB organization
        </DialogTitle>
        <ValidatorForm onSubmit={createOrg} style={{ width: "100%" }}>
          <DialogContent>
            <TextValidator
              variant="outlined"
              margin="normal"
              fullWidth
              label="Organization name"
              onChange={(e) => setName(e.target.value)}
              name="name"
              validators={["required"]}
              errorMessages={["Organization name is required"]}
              value={name}
            />

            <DialogContentText style={{ paddingTop: "2rem" }}>
              and invite your team members
            </DialogContentText>
            <MemberEmail
              onChange={(e) => setEmail1(e.target.value)}
              value={email1}
            />
            <MemberEmail
              onChange={(e) => setEmail2(e.target.value)}
              value={email2}
            />
            <MemberEmail
              onChange={(e) => setEmail3(e.target.value)}
              value={email3}
            />
            <MemberEmail
              onChange={(e) => setEmail4(e.target.value)}
              value={email4}
            />
            <MemberEmail
              onChange={(e) => setEmail5(e.target.value)}
              value={email5}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" color="secondary" variant="contained">
              Create
            </Button>
          </DialogActions>
        </ValidatorForm>
      </Dialog>
    </div>
  );
}
