import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import UserAuthContext from "./UserAuthContext.js";
import Banner from "../Banner";

export default function RequireVerifiedEmail({ children }) {
  const { oauthUser, oauthLoading } = useContext(UserAuthContext);

  if (!oauthUser) {
    if (!oauthLoading) {
      return <Navigate to="/login" />;
    }
    return <></>;
  }

  if (!oauthUser.emailVerified) {
    return <Navigate to="/verify" />;
  }

  return (
    <>
      <Banner />
      {children}
    </>
  );
}
