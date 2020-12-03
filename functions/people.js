const functions = require("firebase-functions");

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;
const ALGOLIA_PEOPLE_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.people_index
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

// Add people records to the search index when created or updated.
exports.onPersonWritten = functions.firestore
  .document("organizations/{orgID}/people/{personID}")
  .onWrite((change, context) => {
    if (!client) {
      console.warn("Algolia client not available; skipping index operation");
      return;
    }
    const index = client.initIndex(ALGOLIA_PEOPLE_INDEX_NAME);

    if (!change.after.exists || change.after.data().deletionTimestamp != "") {
      // Delete person from index;
      index.deleteObject(context.params.personID);
      return;
    }

    let person = change.after.data();

    let personToIndex = {
      // Add an 'objectID' field which Algolia requires
      objectID: change.after.id,
      orgID: context.params.orgID,
      name: person.name,
      company: person.company,
      job: person.job,
      labels: person.labels,
      customFields: person.customFields,
      createdBy: person.createdBy,
      imageURL: person.imageURL,
      creationTimestamp: person.creationTimestamp.seconds,
    };

    // Write to the algolia index
    return index.saveObject(personToIndex);
  });
