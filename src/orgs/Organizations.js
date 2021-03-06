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
import Grid from "@material-ui/core/Grid";
import Shell from "../shell/Shell.js";
import OrgCard from "./OrgCard.js";
import InviteCard from "./InviteCard.js";
import UserAuthContext from "../auth/UserAuthContext";
import FirebaseContext from "../util/FirebaseContext";

export default function Organizations() {
  const { oauthClaims } = useContext(UserAuthContext);
  const [orgIDs, setOrgIDs] = useState([]);
  const [invitedOrgIDs, setInvitedOrgIDs] = useState([]);
  const [claimsInstalledOrgIDs, setClaimsInstalledOrgIDs] = useState([]);

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [pendingOrgIDs, setPendingOrgIDs] = useState([]);

  useEffect(() => {
    if (!oauthClaims) {
      return;
    }

    return db
      .collectionGroup("members")
      .where("email", "==", oauthClaims.email)
      .onSnapshot((snapshot) => {
        let newOrgIDs = [];
        let newInvitedOrgIDs = [];

        snapshot.forEach((doc) => {
          let member = doc.data();
          if (!member.active && member.invited) {
            newInvitedOrgIDs.push(member.orgID);
          }

          if (member.active) {
            newOrgIDs.push(member.orgID);
          }
        });

        setOrgIDs(newOrgIDs);
        setInvitedOrgIDs(newInvitedOrgIDs);
      });
  }, [oauthClaims, firebase, db]);

  useEffect(() => {
    if (!oauthClaims || !oauthClaims.orgs) {
      return;
    }

    setClaimsInstalledOrgIDs(Object.keys(oauthClaims.orgs));
  }, [oauthClaims]);

  useEffect(() => {
    if (!db || !oauthClaims) {
      return;
    }

    const email = oauthClaims.email;
    return db
      .collection("organizations")
      .where("adminEmail", "==", email)
      .onSnapshot((snapshot) => {
        setPendingOrgIDs(snapshot.docs.map((doc) => doc.id));
      });
  }, [db, oauthClaims]);

  console.log("Pending", pendingOrgIDs);

  return (
    <Shell noOrgSelector noSidebar>
      <Grid container style={{ padding: "1rem" }}>
        <Grid container item xs={12}>
          {invitedOrgIDs.length > 0 && (
            <Grid item xs={12}>
              <h5>Pending invites</h5>
            </Grid>
          )}
          {invitedOrgIDs.map((id) => (
            <InviteCard key={id} orgID={id} />
          ))}
        </Grid>

        <Grid container item xs={12}>
          <Grid item xs={12}>
            <h5>Organizations</h5>
          </Grid>
          {[...new Set([...orgIDs, ...pendingOrgIDs])].sort().map((id) => (
            <OrgCard
              key={id}
              orgID={id}
              claimsReady={claimsInstalledOrgIDs.includes(id)}
            />
          ))}
        </Grid>
      </Grid>
    </Shell>
  );
}
