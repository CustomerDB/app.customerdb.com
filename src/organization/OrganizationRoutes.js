import React from "react";

import People from "../people/People.js";
import Data from "../data/Data.js";
import Analyze from "../analyze/Analyze.js";
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

        <Route path="analyze/*">
          <Route path="/" element={<Analyze />} />
          <Route path=":analysisID" element={<Analyze />} />
          <Route path=":analysisID/:tabID" element={<Analyze />} />
          <Route path=":analysisID/:tabID/:tagID" element={<Analyze />} />
        </Route>

        <Route path="settings/*">
          <Route path="/" element={<Settings />} />
          <Route path=":tabID/*" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
      <Outlet />
    </>
  );
}
