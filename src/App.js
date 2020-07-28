import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import WithOauthUser from "./auth/WithOauthUser.js";
import Login from "./auth/Login.js";
import Logout from "./auth/Logout.js";
import JoinOrg from "./auth/JoinOrg.js";
import Error404 from "./404.js";
import Organization from "./organization/Organization.js";

import Admin from "./admin/Admin.js";
import ExampleApp from "./shell/Example1.js";

export default function App() {
  return (
    <Routes caseSensitive>
      <Route
        path="/"
        element={
          <WithOauthUser>
            <Login />
          </WithOauthUser>
        }
      />

      <Route
        path="login"
        element={
          <WithOauthUser>
            <Login />
          </WithOauthUser>
        }
      />

      <Route path="join">
        <Route
          path=":id"
          element={
            <WithOauthUser>
              <JoinOrg />
            </WithOauthUser>
          }
        />
      </Route>

      <Route path="orgs">
        <Route
          path=":orgID/*"
          element={
            <WithOauthUser>
              <Organization />
            </WithOauthUser>
          }
        />
      </Route>

      <Route
        path="admin"
        element={
          <WithOauthUser>
            <Admin />
          </WithOauthUser>
        }
      />

      <Route path="debug" element={<ExampleApp />} />

      <Route path="404" element={<Error404 />} />

      <Route path="logout">
        <Logout />
      </Route>
      <Route path="*" element={<Navigate to="/404" />} />
    </Routes>
  );
}
