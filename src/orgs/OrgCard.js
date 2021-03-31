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

import React, { useContext, useEffect, useState, useRef } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import FirebaseContext from "../util/FirebaseContext.js";
import { useNavigate } from "react-router-dom";
import LinearProgress from "@material-ui/core/LinearProgress";

export default function OrgCard({ orgID, claimsReady }) {
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();
  const [org, setOrg] = useState();
  const [numMembers, setNumMembers] = useState();
  const navigate = useNavigate();
  const [downloadLink, setDownloadLink] = useState();

  const link = useRef();

  useEffect(() => {
    if (!db || !orgID) {
      return;
    }
    return db
      .collection("organizations")
      .doc(orgID)
      .onSnapshot((doc) => setOrg(doc.data()));
  }, [db, orgID]);

  useEffect(() => {
    if (!db || !orgID) {
      return;
    }
    return db
      .collection("organizations")
      .doc(orgID)
      .collection("members")
      .onSnapshot((snapshot) => setNumMembers(snapshot.size));
  }, [db, orgID]);

  useEffect(() => {
    if (!org || !org.dataExportPath) {
      return;
    }

    const storageRef = firebase.storage().ref();
    storageRef
      .child(org.dataExportPath)
      .getDownloadURL()
      .then((url) => {
        setDownloadLink(url);
      });
  });

  let members;
  if (numMembers) {
    members = `${numMembers} members`;
  }
  if (numMembers === 1) {
    members = `${numMembers} member`;
  }

  if (!org) {
    return <></>;
  }

  const ready = org.ready && claimsReady;

  return (
    <Card
      style={{
        margin: "1rem",
        borderRadius: "0.5rem",
        maxHeight: "10rem",
        width: "20rem",
        cursor: ready ? "pointer" : "",
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          style={{ fontWeight: "bold", color: ready ? "black" : "grey" }}
          onClick={() => {
            if (ready) {
              navigate(`/orgs/${orgID}`);
            }
          }}
        >
          {org.name}
        </Typography>
        {!ready && <LinearProgress />}
        {members}
        <br />
        {downloadLink && (
          <Button
            color="secondary"
            variant="contained"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              if (link.current) {
                link.current.click();
              }
            }}
          >
            Export all data
          </Button>
        )}
        <a href={downloadLink} download ref={link}>
          {}
        </a>
      </CardContent>
    </Card>
  );
}
