import { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import algoliasearch from "algoliasearch/lite";

import { useParams } from "react-router-dom";

export function useSearchClient() {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const [client, setClient] = useState();

  const { orgID } = useParams();

  useEffect(() => {
    if (
      !process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX ||
      !process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX ||
      !process.env.REACT_APP_ALGOLIA_SNAPSHOTS_INDEX ||
      !process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX
    ) {
      console.debug("Search not available: missing indexes");
      return;
    }

    if (
      !firebase ||
      !oauthClaims ||
      !oauthClaims.orgs ||
      !oauthClaims.orgs[orgID] ||
      !oauthClaims.user_id
    ) {
      return;
    }

    if (client) {
      return;
    }

    getSearchClient(firebase, orgID, oauthClaims.user_id).then((client) => {
      setClient(client);
    });
  }, [firebase, oauthClaims, orgID, client]);

  return client;
}

function getSearchClient(firebase, orgID, userID) {
  const getSearchKey = firebase
    .functions()
    .httpsCallable("search-getSearchKey");

  return firebase
    .firestore()
    .collection("organizations")
    .doc(orgID)
    .collection("apiKeys")
    .doc(userID)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return getSearchKey({ orgID: orgID }).then((result) => result.data.key);
      }

      let data = doc.data();
      return data.searchKey;
    })
    .then((key) => {
      return algoliasearch("N283NBFKNJ", key);
    });
}
