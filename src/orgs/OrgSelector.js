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

import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FirebaseContext from "../util/FirebaseContext.js";
import MenuItem from "@material-ui/core/MenuItem";
import UserAuthContext from "../auth/UserAuthContext";
import Divider from "@material-ui/core/Divider";

export default function OrgSelector() {
  const { orgID } = useParams();
  const { oauthClaims } = useContext(UserAuthContext);
  const navigate = useNavigate();

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [selectedOrgID, setSelectedOrgID] = useState();

  const [orgMap, setOrgMap] = useState();

  useEffect(() => {
    if (!orgID) {
      return;
    }

    setSelectedOrgID(orgID);
  }, [orgID]);

  useEffect(() => {
    if (!oauthClaims || !oauthClaims.orgs) {
      return;
    }

    let orgIDs = Object.keys(oauthClaims.orgs);

    return db
      .collection("organizations")
      .where(firebase.firestore.FieldPath.documentId(), "in", orgIDs)
      .onSnapshot((snapshot) => {
        let newOrgMap = {};
        snapshot.forEach((doc) => {
          newOrgMap[doc.id] = doc.data().name;
        });
        setOrgMap(newOrgMap);
      });
  }, [oauthClaims, db, firebase.firestore.FieldPath]);

  if (!orgID || !orgMap) return <></>;

  return (
    <>
      <MenuItem disabled>Organizations</MenuItem>
      {Object.keys(orgMap).map((orgID) => (
        <MenuItem
          key={orgID}
          value={orgID}
          selected={orgID === selectedOrgID}
          onClick={() => navigate(`/orgs/${orgID}`)}
        >
          {orgMap[orgID]}
        </MenuItem>
      ))}
      <Divider />
      <MenuItem key="orgs" onClick={() => navigate("/orgs")}>
        See all organizations
      </MenuItem>
    </>
  );
}
