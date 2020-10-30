import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

import React, { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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

  useEffect(() => {
    if (!oauthUser) {
      navigate("/");
      setAuthorized(false);
      return;
    }

    if (oauthClaims) {
      if (!oauthClaims.orgID || oauthClaims.orgID !== orgID) {
        console.debug("user not authorized", oauthClaims);
        navigate("/");
        setAuthorized(false);
        return;
      }

      if (oauthClaims.orgID === orgID) {
        setAuthorized(true);
      }
    }
  }, [navigate, orgID, oauthUser, oauthClaims]);

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
