import React from "react";

const UserAuthContext = React.createContext({
  oauthUser: null,
  oauthClaims: null,
  oauthLoading: true,
});

export default UserAuthContext;
