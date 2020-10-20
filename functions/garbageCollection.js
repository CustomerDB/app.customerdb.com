const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firebase_tools = require("firebase-tools");

exports.people = functions.pubsub
  // .schedule("every 1 hours")
  // .onRun((context) => {
  .topic("garbageCollection-people")
  .onPublish((message) => {
    let db = admin.firestore();

    let now = new Date();
    const retentionDays = 30;
    const expiryTime = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(expiryTime);

    return db
      .collectionGroup("people")
      .where("deletionTimestamp", "<", expiryDate)
      .get()
      .then((peopleSnapshot) =>
        Promise.all(
          peopleSnapshot.docs.map((personDoc) => {
            if (!personDoc.exists) {
              return;
            }

            let person = personDoc.data();
            const path = person
              .toString()
              .substring(person.root.toString().length);
            console.log(`Should delete ${path}`);
            // return firebase_tools.firestore
            //   .delete(path, {
            //     project: process.env.GCLOUD_PROJECT,
            //     recursive: true,
            //     yes: true,
            //     token: functions.config().fb.token
            //   });
          })
        )
      );
  });
