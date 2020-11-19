import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import UserAuthContext from "./UserAuthContext.js";

export default function RequireVerifiedEmail({ children }) {
  const { oauthUser } = useContext(UserAuthContext);

  if (!oauthUser) return <></>;

  if (!oauthUser.emailVerified) {
    return <Navigate to="/verify" />;
  }

  return children;
}
