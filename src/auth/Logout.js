import React from "react";
import { Navigate } from "react-router-dom";

import { logout } from "../util/Utils.js";

export default function Logout(props) {
  logout();
  return <Navigate to="/" />;
}
