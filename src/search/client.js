import algoliasearch from "algoliasearch/lite";

export function getSearchClient(firebase, orgID, userID) {
  const db = firebase.firestore();
  const getSearchKey = firebase.functions().httpsCallable("getSearchKey");

  return db
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
