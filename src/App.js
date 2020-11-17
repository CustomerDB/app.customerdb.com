import { Cookies, Privacy, Terms } from "./legal/Legal.js";
import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider, createMuiTheme } from "@material-ui/core/styles";

import Admin from "./admin/Admin.js";
import Error404 from "./404.js";
import ErrorBoundary from "./util/ErrorBoundary.js";
import Firebase from "./util/Firebase.js";
import FirebaseContext from "./util/FirebaseContext.js";
import JoinOrg from "./auth/JoinOrg.js";
import Login from "./auth/Login.js";
import Logout from "./auth/Logout.js";
import Organization from "./organization/Organization.js";
import React from "react";
import ResetPassword from "./auth/ResetPassword.js";
import { BrowserRouter as Router } from "react-router-dom";
import Signup from "./auth/Signup.js";
import Verify from "./auth/Verify.js";
import WithOauthUser from "./auth/WithOauthUser.js";

export default function App() {
  const appTheme = createMuiTheme({
    shadows: ["none"],
    palette: {
      primary: {
        main: "#1b2a4e",
      },
      secondary: {
        main: "#ff5252",
      },
    },
  });

  return (
    <Router>
      <ErrorBoundary>
        <FirebaseContext.Provider value={new Firebase()}>
          <ThemeProvider theme={appTheme}>
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
                  path=":orgID"
                  element={
                    <WithOauthUser>
                      <JoinOrg />
                    </WithOauthUser>
                  }
                />
              </Route>

              <Route path="signup" element={<Signup />} />

              <Route path="verify" element={<Verify />} />

              <Route path="/reset-password" element={<ResetPassword />} />

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

              <Route path="terms" element={<Terms />} />

              <Route path="privacy" element={<Privacy />} />

              <Route path="cookies" element={<Cookies />} />

              <Route path="404" element={<Error404 />} />

              <Route path="logout">
                <Logout />
              </Route>

              <Route path="*" element={<Navigate to="/404" />} />
            </Routes>
          </ThemeProvider>
        </FirebaseContext.Provider>
      </ErrorBoundary>
    </Router>
  );
}
