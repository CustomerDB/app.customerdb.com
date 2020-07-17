import React from "react";
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Organization from "./Organization.js";
import JoinOrg from "./JoinOrg.js";
import Login from "./Login.js";
import { logout } from "./Utils.js";
import Error404 from "./404.js";
import { Loading } from "./Utils.js";

export default function App() {
  return (
    <Routes caseSensitive>
      <Route path="/" element={<WithOauthUser element={<Login />} />} />

      <Route path="login" element={<WithOauthUser element={<Login />} />} />

      <Route path="join">
        <Route path=":id" element={<WithOauthUser element={<JoinOrg />} />} />
      </Route>

      <Route path="orgs">
        <Route
          path=":orgID/*"
          element={<WithOauthUser element={<Organization />} />}
        />
      </Route>

      <Route path="404" element={<Error404 />} />

      <Route path="logout">
        <Logout />
      </Route>

      <Route path="*" element={<Navigate to="/404" />} />
    </Routes>
  );
}

function Logout(props) {
  logout();
  return <Navigate to="/" />;
}

function WithOauthUser(props) {
  const [oauthUser, setOauthUser] = useState(null);
  const [oauthLoading, setOauthLoading] = useState(true);

  useEffect(() => {
    const loginCallback = (user) => {
      console.debug("loginCallback user", user);
      setOauthUser(user);
      setOauthLoading(false);
    };
    let unsubscribe = window.firebase.auth().onAuthStateChanged(loginCallback);
    return unsubscribe;
  }, [props.element]);

  if (oauthLoading) {
    return <Loading />;
  }

  return React.cloneElement(props.element, {
    oauthUser: oauthUser,
    oauthLoading: oauthLoading,
  });
}
