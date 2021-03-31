// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
  }, [props.children, firebase]);

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
  }, [oauthUser, firebase]);

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
