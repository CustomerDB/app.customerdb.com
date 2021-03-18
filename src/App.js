import { Cookies, Privacy, Terms } from "./legal/Legal.js";
import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider, createMuiTheme } from "@material-ui/core/styles";

import Admin from "./admin/Admin.js";
import Error404 from "./404.js";
import ErrorBoundary from "./util/ErrorBoundary.js";
import Firebase from "./util/Firebase.js";
import FirebaseContext from "./util/FirebaseContext.js";
import Login from "./auth/Login.js";
import Logout from "./auth/Logout.js";
import Organization from "./organization/Organization.js";
import Organizations from "./orgs/Organizations.js";
import React from "react";
import RequireMembership from "./auth/RequireMembership.js";
import RequireVerifiedEmail from "./auth/RequireVerifiedEmail.js";
import ResetPassword from "./auth/ResetPassword.js";
import { BrowserRouter as Router } from "react-router-dom";
import Signup from "./auth/Signup.js";
import Verify from "./auth/Verify.js";
import WithOauthUser from "./auth/WithOauthUser.js";

function Banner() {
  let now = new Date();
  let end = new Date("2021-04-11");
  let accessMs = end.getTime() - now.getTime();
  let accessDays = Math.ceil(accessMs / (1000 * 3600 * 24));

  return (
    <div
      style={{
        position: "fixed",
        zIndex: "2147483003",
        bottom: 0,
        height: "14rem",
        width: "100%",
        backgroundColor: "white",
        boxShadow:
          "rgba(0, 0, 0, 0.2) 0px 2px 1px -1px, rgba(0, 0, 0, 0.14) 0px 1px 1px 0px, rgba(0, 0, 0, 0.12) 0px 1px 3px 0px",
      }}
    >
      <div
        style={{
          padding: "2rem",
        }}
      >
        <h4>
          Your CustomerDB access ends{" "}
          {accessDays > 0 ? (
            <>
              in {accessDays} day{accessDays > 1 && "s"}.
            </>
          ) : (
            <>very soon!</>
          )}
        </h4>
        <p>
          We had a blast serving you, but unfortunately we are shutting down
          during the coming weeks.
        </p>
        <p>
          Click <a href="/orgs">here</a> to download a copy of your data. You
          can email us at{" "}
          <a href="mailto:founders@quantap.com">founders@quantap.com</a> if you
          have any questions.
        </p>
        <br />
        <p>
          <b>Note:</b> after <b>April 11th</b>, we won't be able to guarantee
          access to your data.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const appTheme = createMuiTheme({
    // change the default elevation for paper and cards to 0
    props: {
      MuiCard: {
        elevation: 0,
      },
      MuiAppBar: {
        elevation: 0,
      },
    },
    palette: {
      primary: {
        main: "#1b2a4e",
      },
      secondary: {
        main: "#ff5252",
      },
    },
    overrides: {
      MuiButton: {
        root: {
          borderRadius: "0.5rem",
          textTransform: "none",
          fontWeight: "bold",
        },
      },
      MuiTab: {
        root: {
          textTransform: "none",
          fontWeight: "bold",
        },
        selected: {
          color: "#ff5252",
        },
      },
    },
  });

  return (
    <>
      <Banner />
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
                  <Route path=":orgID" element={<RedirectToSignup />} />
                </Route>

                <Route path="signup" element={<Signup />} />

                <Route path="verify" element={<Verify />} />

                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="orgs">
                  <Route
                    path="/"
                    element={
                      <WithOauthUser>
                        <RequireVerifiedEmail>
                          <Organizations />
                        </RequireVerifiedEmail>
                      </WithOauthUser>
                    }
                  />
                  <Route
                    path=":orgID/*"
                    element={
                      <WithOauthUser>
                        <RequireVerifiedEmail>
                          <RequireMembership>
                            <Organization />
                          </RequireMembership>
                        </RequireVerifiedEmail>
                      </WithOauthUser>
                    }
                  />
                </Route>

                <Route
                  path="admin"
                  element={
                    <WithOauthUser>
                      <RequireVerifiedEmail>
                        <Admin />
                      </RequireVerifiedEmail>
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
    </>
  );
}

function RedirectToSignup() {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get("email");
  const urlEncodedEmail = encodeURIComponent(email);
  return <Navigate to={`/signup?email=${urlEncodedEmail}`} />;
}
