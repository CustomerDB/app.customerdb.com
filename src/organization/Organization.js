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

import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";

import { Loading } from "../util/Utils.js";
import OrganizationRoutes from "./OrganizationRoutes.js";
import UserAuthContext from "../auth/UserAuthContext";
import { loadIntercom } from "../util/intercom.js";

export default function Organization() {
  const { oauthUser, oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();

  const navigate = useNavigate();
  const location = useLocation();

  const [authorized, setAuthorized] = useState(false);
  const [intercomInit, setIntercomInit] = useState(false);

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  useEffect(() => {
    if (!oauthUser) {
      navigate("/");
      setAuthorized(false);
      return;
    }

    if (oauthClaims) {
      if (!oauthClaims.orgs || !oauthClaims.orgs[orgID]) {
        console.debug("user not authorized", oauthClaims);
        navigate("/");
        setAuthorized(false);
        return;
      }

      if (oauthClaims.orgs[orgID]) {
        setAuthorized(true);

        // Write back the orgID into the userToOrg map, such that the next fresh login
        // takes the user to the last loaded organization.
        db.collection("userToOrg").doc(oauthUser.email).set({
          orgID: orgID,
        });
      }
    }
  }, [navigate, orgID, oauthUser, oauthClaims, db]);

  // Initialize intercom on load
  useEffect(() => {
    if (!authorized || !oauthClaims) return;

    if (window) {
      window.performancePromise.then(() => {
        console.log("Loading intercom");
        loadIntercom();

        if (!window.Intercom) return;

        let intercomConfig = Object.assign({ app_id: "xdjuo7oo" }, oauthClaims);
        window.Intercom("boot", intercomConfig);

        console.log("Done loading intercom");
        setIntercomInit(true);
      });
    }
  }, [authorized, oauthClaims]);

  // Update intercom whenever the URL changes
  useEffect(() => {
    if (!intercomInit) return;
    window.Intercom("update");
  }, [intercomInit, location]);

  if (!authorized) return <Loading />;

  return <OrganizationRoutes />;
}
