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
import { Navigate } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "./UserAuthContext.js";

// RequireMembership renders the children only if the currently
// signed in user has any org membership (one or more active
// membership, or pending invite)
export default function RequireMembership({ children }) {
  const { oauthUser } = useContext(UserAuthContext);
  const [loaded, setLoaded] = useState(false);
  const [numOrgs, setNumOrgs] = useState();
  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    if (!firebase || !oauthUser || !oauthUser.email) {
      return;
    }
    const db = firebase.firestore();

    console.debug("reading member records from database", oauthUser.email);
    return db
      .collectionGroup("members")
      .where("email", "==", oauthUser.email)
      .onSnapshot((snapshot) => {
        const count = snapshot.size;
        console.debug(
          `user ${oauthUser.email} is a member of ${count} organizations (active + invited)`
        );
        setNumOrgs(count);
        setLoaded(true);
      });
  }, [firebase, oauthUser]);

  if (!loaded) return <></>;

  if (loaded && numOrgs === 0) {
    return <Navigate to="/logout" />;
  }

  return <>{children}</>;
}
