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

import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import AvatarGroup from "@material-ui/lab/AvatarGroup";
import Tooltip from "@material-ui/core/Tooltip";
import UserAuthContext from "../auth/UserAuthContext.js";

const syncPeriod = 5000;

export default function Collaborators({ dbRef }) {
  const { oauthUser } = useContext(UserAuthContext);

  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!dbRef || !oauthUser) {
      return;
    }

    const updateCollaborators = () => {
      let collaboratorRef = dbRef
        .collection("collaborators")
        .doc(oauthUser.email);

      let collaborator = {
        expires: firebaseClient.firestore.Timestamp.now().toMillis() + 5000,
      };

      if (oauthUser.email) {
        collaborator.email = oauthUser.email;
      }

      if (oauthUser.displayName) {
        collaborator.name = oauthUser.displayName;
      }

      if (oauthUser.photoURL) {
        collaborator.photoURL = oauthUser.photoURL;
      }

      collaboratorRef.set(collaborator).then(() => {
        dbRef
          .collection("collaborators")
          .get()
          .then((snapshot) => {
            let newCollaborators = [];
            let now = firebaseClient.firestore.Timestamp.now().toMillis();
            snapshot.forEach((doc) => {
              let collaborator = doc.data();
              if (collaborator.expires < now) {
                doc.ref.delete();
                return;
              }

              newCollaborators.push(doc.data());
            });

            setCollaborators(newCollaborators);
          });
      });
    };

    updateCollaborators();

    let interval = setInterval(() => {
      updateCollaborators();
    }, syncPeriod);

    return () => {
      clearInterval(interval);
    };
  }, [dbRef, oauthUser]);

  return (
    <AvatarGroup max={4}>
      {collaborators.map((collaborator) => (
        <Tooltip key={collaborator.email} title={collaborator.name}>
          <Avatar
            style={{ width: "34px", height: "34px" }}
            key={collaborator.email}
            alt={collaborator.name}
            src={collaborator.photoURL}
          />
        </Tooltip>
      ))}
    </AvatarGroup>
  );
}
