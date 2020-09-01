import { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import { Loading } from "../util/Utils.js";
import React from "react";
import UserAuthContext from "./UserAuthContext.js";

export default function WithOauthUser(props) {
  const [oauthUser, setOauthUser] = useState(null);
  const [oauthClaims, setOauthClaims] = useState();
  const [oauthLoading, setOauthLoading] = useState(true);

  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    const loginCallback = (user) => {
      console.debug("loginCallback user", user);
      setOauthUser(user);
      setOauthLoading(false);
    };
    let unsubscribe = firebase.auth().onAuthStateChanged(loginCallback);
    return unsubscribe;
  }, [props.children]);

  useEffect(() => {
    if (oauthUser === null) {
      setOauthClaims(undefined);
      return;
    }

    let refreshTrigger = firebase
      .firestore()
      .collection("uids")
      .doc(oauthUser.uid);
    return refreshTrigger.onSnapshot(() => {
      console.debug("received refresh trigger -- refreshing id token");

      return oauthUser.getIdTokenResult(true).then((idTokenResult) => {
        console.debug("current token claims", idTokenResult.claims);
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
