const functions = require("firebase-functions");
const admin = require("firebase-admin");
const algoliasearch = require("algoliasearch");

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;
const ALGOLIA_SEARCH_KEY = functions.config().algolia
  ? functions.config().algolia.search_key
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

function getKey(orgID, uid) {
  const params = {
    filters: `orgID:${orgID}`,
    userToken: uid,
  };

  // Call the Algolia API to generate a unique key based on our search key
  return client.generateSecuredApiKey(ALGOLIA_SEARCH_KEY, params);
}

exports.provisionSearchKey = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    if (!change.after.exists) {
      return;
    }

    const orgID = context.params.orgID;
    const email = context.params.email;

    let userRecordPromise = admin.auth().getUserByEmail(email);

    return userRecordPromise.then((userRecord) => {
      let member = change.after.data();
      let db = admin.firestore();
      let apiKeyRef = db
        .collection("organizations")
        .doc(orgID)
        .collection("apiKeys")
        .doc(userRecord.uid);

      if (!member.active) {
        return apiKeyRef.delete();
      }

      const key = getKey(orgID, userRecord.uid);
      return apiKeyRef.set({
        searchKey: key,
      });
    });
  });

// Provision a new API key for the client to use when making
// search index queries.
exports.getSearchKey = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  let orgID = data.orgID;
  const orgsFromClaim = context.auth.token.orgs;
  if (!orgsFromClaim || !orgsFromClaim[orgID]) {
    throw new functions.https.HttpsError(
      "permission-denied",
      `user does not have permision to search org ${orgID}`
    );
  }

  // // Create the params object as described in the Algolia documentation:
  // // https://www.algolia.com/doc/guides/security/api-keys/#generating-api-keys
  // const params = {
  //   // This filter ensures that only items where orgID == user's
  //   // org ID are readable.
  //   filters: `orgID:${orgID}`,
  //   // We also proxy the token uid as a unique token for this key.
  //   userToken: context.auth.uid,
  // };

  // // Call the Algolia API to generate a unique key based on our search key
  // const key = client.generateSecuredApiKey(ALGOLIA_SEARCH_KEY, params);

  const key = getKey(orgID, context.auth.uid);

  // Store it in the user's api key document.
  let db = admin.firestore();
  let apiKeyRef = db
    .collection("organizations")
    .doc(orgID)
    .collection("apiKeys")
    .doc(context.auth.uid);

  return apiKeyRef
    .set({
      searchKey: key,
    })
    .then(() => {
      return { key: key };
    });
});
