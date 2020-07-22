import React from "react";
import { useContext, useEffect, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

import { useNavigate, useParams } from "react-router-dom";

import { Loading } from "../Utils.js";

import {
  DoorOpen,
  People,
  ChatLeftQuote,
  GearWide,
  Intersect,
  House,
} from "react-bootstrap-icons";

import OrganizationRoutes from "./Routes.js";

import Shell from "../shell/Shell.js";
import Navigation from "../shell/Navigation.js";

export default function Organization(props) {
  const auth = useContext(UserAuthContext);
  const { orgID } = useParams();
  const navigate = useNavigate();

  console.log("auth", auth);

  if (auth.oauthLoading) {
    return <Loading />;
  }

  if (auth.oauthUser === null) {
    navigate("/logout");
  }

  if (!auth.oauthClaims) {
    return <Loading />;
  }

  if (auth.oauthClaims.orgID !== orgID) {
    console.debug("user not authorized for this organization");
    navigate("/404");
  }

  return (
    <Shell>
      <Navigation>
        <Navigation.Top>
          <Navigation.Item
            name="Home"
            icon={<House />}
            path={`/orgs/${orgID}`}
            end={true}
          />
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
