import React from "react";

import OrganizationHome from "./OrganizationHome.js";
import People from "../people/People.js";
import Data from "../data/Data.js";
import Explore from "../explore/Explore.js";
import Settings from "../settings/Settings.js";

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

  return (
    <>
      <Routes>
        <Route path="/" element={<OrganizationHome />} />

        <Route path="people/*">
          <Route path="/" element={<People />} />
          <Route path=":personID" element={<People />} />
          <Route path=":personID/:tabID" element={<People />} />
        </Route>

        <Route path="data/*">
          <Route path="/" element={<Data />} />
          <Route path=":documentID" element={<Data />} />
          <Route path=":documentID/:tabID" element={<Data />} />
        </Route>

        <Route path="explore/*">
          <Route path="/" element={<Explore />} />
          <Route path=":datasetID" element={<Explore />} />
          <Route path=":datasetID/:tabID" element={<Explore />} />
        </Route>

        <Route
          path="settings/*"
          element={
            <Settings
              membersRef={membersRef}
              tagGroupsRef={tagGroupsRef}
              peopleRef={peopleRef}
            />
          }
        />

        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
      <Outlet />
    </>
  );
}
