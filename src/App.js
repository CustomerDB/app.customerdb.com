import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import WithOauthUser from "./auth/WithOauthUser.js";
import Login from "./auth/Login.js";
import Logout from "./auth/Logout.js";
import JoinOrg from "./auth/JoinOrg.js";
import Error404 from "./404.js";
import Organization from "./organization/Organization.js";

export default function App() {
  return (
    <Routes caseSensitive>
      <WithOauthUser>
        <Route path="/" element={<Login />} />

        <Route path="login" element={<Login />} />

        <Route path="join">
          <Route path=":id" element={<JoinOrg />} />
        </Route>

        <Route path="orgs">
          <Route path=":orgID/*" element={<Organization />} />
        </Route>
      </WithOauthUser>

      <Route path="404" element={<Error404 />} />

      <Route path="logout">
        <Logout />
      </Route>
      <Route path="*" element={<Navigate to="/404" />} />
    </Routes>
  );
}
