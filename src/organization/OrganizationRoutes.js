import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import Analyze from "../analyze/Analyze.js";
import Guides from "../guides/Guides.js";
import Interviews from "../interviews/Interviews.js";
import People from "../people/People.js";
import Quotes from "../quotes/Quotes.js";
import React from "react";
import Settings from "../settings/Settings.js";

export default function OrganizationRoutes(props) {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="quotes" />} />

        <Route path="people/*">
          <Route path="/" element={<People />} />
          <Route path=":personID" element={<People />} />
          <Route path="create" element={<People create />} />
          <Route path=":personID/:tabID" element={<People />} />
        </Route>

        <Route path="interviews/*">
          <Route path="/" element={<Interviews />} />
          <Route path="create" element={<Interviews create />} />
          <Route path="guide" element={<Interviews create fromGuide />} />
          <Route path=":documentID" element={<Interviews />} />
          <Route path=":documentID/:tabID" element={<Interviews />} />
        </Route>

        <Route path="quotes/*">
          <Route path="/" element={<Quotes />} />
        </Route>

        <Route path="guides/*">
          <Route path="/" element={<Guides />} />
          <Route path="create" element={<Guides create />} />
          <Route path=":guideID" element={<Guides />} />
        </Route>

        <Route path="analyze/*">
          <Route path="/" element={<Analyze />} />
          <Route path="create" element={<Analyze create />} />
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
