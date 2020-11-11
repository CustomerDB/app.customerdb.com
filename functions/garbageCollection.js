const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase_tools = require("firebase-tools");

function garbageCollect(collection) {
  let db = admin.firestore();

  let now = new Date();
  const retentionDays = 30;
  const expiryTime = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const expiryDate = new Date(expiryTime);

  console.log(`${collection} garbage collection started`);

  return db
    .collectionGroup(collection)
    .where("deletionTimestamp", "<", expiryDate)
    .get()
    .then((snapshot) =>
      Promise.all(
        snapshot.docs.map((doc) => {
          if (!doc.exists) {
            return;
          }

          let ref = doc.ref;
          let path = ref._path.segments.join("/");

          console.warn(
            `Deleting ${path} recursively... deleted at ${doc
              .data()
              .deletionTimestamp.toDate()
              .toISOString()}`
          );

          return firebase_tools.firestore.delete(path, {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            token: functions.config().system.token,
          });
        })
      )
    );
}

exports.people = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("people");
  });
