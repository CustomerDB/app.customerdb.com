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
      !process.env.REACT_APP_ALGOLIA_BOARDS_INDEX ||
      !process.env.REACT_APP_ALGOLIA_SUMMARIES_INDEX ||
      !process.env.REACT_APP_ALGOLIA_THEMES_INDEX ||
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
