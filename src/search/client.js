import algoliasearch from "algoliasearch/lite";

const db = window.firebase.firestore();
const getSearchKey = window.firebase.functions().httpsCallable("getSearchKey");

export function getSearchClient(orgID, userID) {
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
