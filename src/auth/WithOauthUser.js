import React from "react";
import { useState, useEffect } from "react";

import { Loading } from "../Utils.js";
import UserAuthContext from "./UserAuthContext.js";

export default function WithOauthUser(props) {
  const [oauthUser, setOauthUser] = useState(null);
  const [oauthClaims, setOauthClaims] = useState();
  const [oauthLoading, setOauthLoading] = useState(true);

  const db = window.firebase.firestore();

  useEffect(() => {
    const loginCallback = (user) => {
      console.debug("loginCallback user", user);
      setOauthUser(user);
      setOauthLoading(false);
    };
    let unsubscribe = window.firebase.auth().onAuthStateChanged(loginCallback);
    return unsubscribe;
  }, [props.children]);

  useEffect(() => {
    if (oauthUser === null) return;

    let refreshTrigger = db.collection("uids").doc(oauthUser.uid);
    return refreshTrigger.onSnapshot(() => {
      console.debug("received refresh trigger -- refreshing id token");
      let idToken = oauthUser.getIdToken(true);

      return window.firebase
        .auth()
        .currentUser.getIdTokenResult()
        .then((idTokenResult) => {
          console.log("current token claims", idTokenResult.claims);
          setOauthClaims(idTokenResult.claims);
        });
    });
  }, [oauthUser]);

  if (oauthLoading) {
    return <Loading />;
  }

  let contextValue = {
    oauthUser: oauthUser,
    oauthClaims: oauthClaims,
    oauthLoading: oauthLoading,
  };

  return (
    <UserAuthContext.Provider value={contextValue}>
      {props.children}
    </UserAuthContext.Provider>
  );
}
