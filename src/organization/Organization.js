import React from "react";
import { useContext, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

import { useNavigate, useLocation, useParams } from "react-router-dom";

import { Loading } from "../util/Utils.js";

import {
  DoorOpen,
  People,
  ChatLeftQuote,
  GearWide,
  Intersect,
  House,
} from "react-bootstrap-icons";

import OrganizationRoutes from "./OrganizationRoutes.js";
import Shell from "../shell/Shell.js";
import Navigation from "../shell/Navigation.js";

export default function Organization(props) {
  const { oauthUser, oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [intercomInit, setIntercomInit] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (!oauthUser) {
      navigate("/logout");
      setAuthorized(false);
      return;
    }

    if (oauthClaims) {
      if (!oauthClaims.orgID || oauthClaims.orgID !== orgID) {
        console.debug("user not authorized");
        navigate("/logout");
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
    let intercomConfig = Object.assign({ app_id: "xdjuo7oo" }, oauthClaims);
    window.Intercom("boot", intercomConfig);
    setIntercomInit(true);
  }, [authorized, oauthClaims]);

  // Update intercom whenever the URL changes
  useEffect(() => {
    if (!intercomInit) return;
    window.Intercom("update");
  }, [intercomInit, location]);

  if (!authorized) return <Loading />;

  return (
    <Shell>
      <Navigation>
        <Navigation.Top>
          <Navigation.Item
            name="People"
            icon={<People />}
            path={`/orgs/${orgID}/people`}
            end={false}
          />
          <Navigation.Item
            name="Data"
            icon={<ChatLeftQuote />}
            path={`/orgs/${orgID}/data`}
            end={false}
          />
          <Navigation.Item
            name="Explore"
            icon={<Intersect />}
            path={`/orgs/${orgID}/explore`}
            end={false}
          />
        </Navigation.Top>
        <Navigation.Bottom>
          <Navigation.Item
            name="Settings"
            icon={<GearWide />}
            path={`/orgs/${orgID}/settings`}
            end={false}
          />
          <Navigation.Item
            name="Logout"
            icon={<DoorOpen />}
            path={`/logout`}
            end={true}
          />
        </Navigation.Bottom>
      </Navigation>

      <OrganizationRoutes />
    </Shell>
  );
}
