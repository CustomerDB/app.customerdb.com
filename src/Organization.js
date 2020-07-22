import React from "react";
import { useEffect, useState } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import OrganizationRoutes from "./organization/Routes.js";

import { useNavigate, useParams } from "react-router-dom";

import { logout, Loading } from "./Utils.js";

import Shell from "./shell/Shell.js";
import Navigation from "./shell/Navigation.js";

import {
  DoorOpen,
  People,
  ChatLeftQuote,
  GearWide,
  Intersect,
  House,
} from "react-bootstrap-icons";
const db = window.firebase.firestore();

export default function Organization(props) {
  const [user, setUser] = useState(undefined);

  const navigate = useNavigate();

  // TODO: Rely on claims in the oauth user instead.
  const { orgID } = useParams();
  const orgRef = db.collection("organizations").doc(orgID);
  const membersRef = orgRef.collection("members");
  useEffect(() => {
    if (props.oauthUser === null) {
      navigate("/login");
      return;
    }
    const userRef = membersRef.doc(props.oauthUser.email);
    let unsubscribe = userRef.onSnapshot(
      (doc) => {
        if (!doc.exists) {
          logout();
        }
        setUser(doc.data());
      },
      (error) => {
        console.error(error);
        navigate("/404");
      }
    );
    return unsubscribe;
  }, [orgID, props.oauthUser]);

  if (user === undefined) {
    return <Loading />;
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

      <OrganizationRoutes user={user} />
    </Shell>
  );
}
