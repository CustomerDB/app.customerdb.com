import { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import algoliasearch from "algoliasearch/lite";

export function useSearchClient() {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const [client, setClient] = useState();

  useEffect(() => {
    if (
      process.env.REACT_APP_FIREBASE_PROJECT_ID === "customerdb-development"
    ) {
      console.debug("hosted search is disabled for local development");
      return;
    }

    if (
      !firebase ||
      !oauthClaims ||
      !oauthClaims.orgID ||
      !oauthClaims.user_id
    ) {
      return;
    }

    if (client) {
      return;
    }

    getSearchClient(firebase, oauthClaims.orgID, oauthClaims.user_id).then(
      (client) => {
        setClient(client);
      }
    );
  }, [firebase, oauthClaims, oauthClaims.orgID, oauthClaims.user_id]);

  return client;
}

function getSearchClient(firebase, orgID, userID) {
  const getSearchKey = firebase.functions().httpsCallable("getSearchKey");

  return firebase
    .firestore()
    .collection("organizations")
    .doc(orgID)
    .collection("apiKeys")
    .doc(userID)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return getSearchKey().then((result) => result.data.key);
      }

      let data = doc.data();
      return data.searchKey;
    })
    .then((key) => {
      return algoliasearch("N283NBFKNJ", key);
    });
}
