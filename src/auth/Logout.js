import { Navigate } from "react-router-dom";
import React from "react";
import { useLogout } from "../util/Utils.js";

export default function Logout(props) {
  const logout = useLogout();
  logout();
  return <Navigate to="/" />;
}
