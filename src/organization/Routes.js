import React from "react";

import OrganizationHome from "../OrganizationHome.js";
import People from "../people/People.js";
import Sources from "../Sources.js";
import Explore from "../Explore.js";
import Settings from "../Settings.js";

import { Routes, Route, Outlet, Navigate, useParams } from "react-router-dom";

const db = window.firebase.firestore();

export default function OrganizationRoutes(props) {
  const { orgID } = useParams();

  const orgRef = db.collection("organizations").doc(orgID);

  const membersRef = orgRef.collection("members");
  const peopleRef = orgRef.collection("people");
  const documentsRef = orgRef.collection("documents");
  const tagGroupsRef = orgRef.collection("tagGroups");
  const datasetsRef = orgRef.collection("datasets");
  const allHighlightsRef = db.collectionGroup("highlights");

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<OrganizationHome user={props.user} orgRef={orgRef} />}
        />

        <Route path="people/*">
          <Route
            path="/"
            element={<People peopleRef={peopleRef} user={props.user} />}
          />
          <Route
            path=":personID"
            element={<People peopleRef={peopleRef} user={props.user} />}
          />
          <Route
            path=":personID/:tabID"
            element={<People peopleRef={peopleRef} user={props.user} />}
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
                user={props.user}
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
                user={props.user}
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
                user={props.user}
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
                user={props.user}
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
                user={props.user}
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
                user={props.user}
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
                user={props.user}
                membersRef={membersRef}
              />
            }
          />
          <Route
            path="profile"
            element={
              <Settings
                selected="profile"
                user={props.user}
                membersRef={membersRef}
              />
            }
          />
          <Route
            path="members"
            element={
              <Settings
                selected="members"
                user={props.user}
                membersRef={membersRef}
              />
            }
          />
          <Route
            path="organization"
            element={<Settings selected="organization" user={props.user} />}
          />
          <Route
            path="backup"
            element={<Settings selected="backup" user={props.user} />}
          />
          <Route path="tags">
            <Route
              path="/"
              element={
                <Settings
                  selected="tags"
                  orgID={orgID}
                  tagGroupsRef={tagGroupsRef}
                  user={props.user}
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
                  user={props.user}
                />
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
      <Outlet />
    </>
  );
}
