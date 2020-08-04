import React from "react";

import People from "../people/People.js";
import Data from "../data/Data.js";
import Explore from "../explore/Explore.js";
import Settings from "../settings/Settings.js";

import { Routes, Route, Outlet, Navigate } from "react-router-dom";

export default function OrganizationRoutes(props) {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="data" />} />

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
          <Route path=":datasetID/:tabID/:tagID" element={<Explore />} />
        </Route>

        <Route path="settings/*" element={<Settings />} />

        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
      <Outlet />
    </>
  );
}
