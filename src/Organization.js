import React from "react";
import { useEffect, useState } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

import Nav from "./Nav.js";
import OrganizationHome from "./OrganizationHome.js";
import People from "./People.js";
import Sources from "./Sources.js";
import Explore from "./Explore.js";
import Settings from "./Settings.js";

import { logout } from "./Utils.js";

import {
  Routes,
  Route,
  Outlet,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";

import { Loading } from "./Utils.js";

var db = window.firebase.firestore();

export default function Organization(props) {
  const [user, setUser] = useState(undefined);

  const navigate = useNavigate();

  const { orgID } = useParams();
  const orgRef = db.collection("organizations").doc(orgID);
  const membersRef = orgRef.collection("members");
  const peopleRef = orgRef.collection("people");
  const documentsRef = orgRef.collection("documents");
  const tagGroupsRef = orgRef.collection("tagGroups");
  const datasetsRef = orgRef.collection("datasets");
  const allHighlightsRef = db.collectionGroup("highlights");

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
    <div className="navContainer">
      <Nav active="datasets" />
      <div className="navBody">
        <Routes>
          <Route
            path="/"
            element={
              <OrganizationHome user={user} orgRef={orgRef} />
            }
          />

          <Route path="people/*">
            <Route
              path="/"
              element={
                <People peopleRef={peopleRef} user={user} />
              }
            />
            <Route
              path=":personID"
              element={
                <People peopleRef={peopleRef} user={user} />
              }
            />
            <Route
              path=":personID/:tabID"
              element={
                <People peopleRef={peopleRef} user={user} />
              }
            />
          </Route>

          <Route path="data/*">
            <Route
              path="/"
              element={
                <Sources
                  documentsRef={documentsRef}
                  tagGroupsRef={tagGroupsRef}
                  peopleRef={peopleRef}
                  user={user}
                />
              }
            />
            <Route
              path=":documentID"
              element={
                <Sources
                  documentsRef={documentsRef}
                  tagGroupsRef={tagGroupsRef}
                  peopleRef={peopleRef}
                  user={user}
                />
              }
            />
            <Route
              path=":documentID/:tabID"
              element={
                <Sources
                  documentsRef={documentsRef}
                  tagGroupsRef={tagGroupsRef}
                  peopleRef={peopleRef}
                  user={user}
                />
              }
            />
          </Route>

          <Route path="explore/*">
            <Route
              path="/"
              element={
                <Explore
                  orgID={orgID}
                  user={user}
                  documentsRef={documentsRef}
                  datasetsRef={datasetsRef}
                  allHighlightsRef={allHighlightsRef}
                />
              }
            />
            <Route
              path=":datasetID"
              element={
                <Explore
                  user={user}
                  documentsRef={documentsRef}
                  datasetsRef={datasetsRef}
                  allHighlightsRef={allHighlightsRef}
                />
              }
            />
            <Route
              path=":datasetID/:tabID"
              element={
                <Explore
                  user={user}
                  documentsRef={documentsRef}
                  datasetsRef={datasetsRef}
                  allHighlightsRef={allHighlightsRef}
                />
              }
            />
          </Route>

          <Route path="settings/*">
            <Route
              path="/"
              element={
                <Settings
                  selected="profile"
                  user={user}
                  membersRef={membersRef}
                />
              }
            />
            <Route
              path="profile"
              element={
                <Settings
                  selected="profile"
                  user={user}
                  membersRef={membersRef}
                />
              }
            />
            <Route
              path="members"
              element={
                <Settings
                  selected="members"
                  user={user}
                  membersRef={membersRef}
                />
              }
            />
            <Route
              path="organization"
              element={<Settings selected="organization" user={user} />}
            />
            <Route
              path="backup"
              element={<Settings selected="backup" user={user} />}
            />
            <Route path="tags">
              <Route
                path="/"
                element={
                  <Settings
                    selected="tags"
                    orgID={orgID}
                    tagGroupsRef={tagGroupsRef}
                    user={user}
                  />
                }
              />
              <Route
                path=":tgID"
                element={
                  <Settings
                    selected="tags"
                    orgID={orgID}
                    tagGroupsRef={tagGroupsRef}
                    user={user}
                  />
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/404" />} />
        </Routes>
        <Outlet />
      </div>
    </div>
  );
}
