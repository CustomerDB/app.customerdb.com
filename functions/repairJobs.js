const functions = require("firebase-functions");
const tmp = require("tmp");
const admin = require("firebase-admin");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

exports.reThumbnailEverything = functions.pubsub
  .topic("reThumbnailEverything")
  .onPublish((message) => {
    // Search for transcriptions with thumbnailToken set
    // and set that field to empty string.
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) =>
            db
              .collection("organizations")
              .doc(orgRef.id)
              .collection("transcriptions")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let data = doc.data();
                    if (data.thumbnailToken) {
                      return doc.ref.update({ thumbnailToken: "" });
                    }
                  })
                )
              )
          )
        );
      });
  });

exports.reIndexAllHighlights = functions.pubsub
  .topic("reindex-all-highlights")
  .onPublish((message) => {
    // Search for highlights and update the indexRequestedTimestamp.
    const db = admin.firestore();

    const reindexAllInSnapshot = (snapshot) => {
      return Promise.all(
        snapshot.docs.map((doc) =>
          doc.ref.update({
            indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
        )
      );
    };

    let highlightsPromise = db
      .collectionGroup("highlights")
      .get()
      .then(reindexAllInSnapshot);

    let transcriptHighlightsPromise = db
      .collectionGroup("transcriptHighlights")
      .get()
      .then(reindexAllInSnapshot);

    return Promise.all([highlightsPromise, transcriptHighlightsPromise]);
  });

exports.rewriteOauthClaims = functions.pubsub
  .topic("rewrite-oauth-claims")
  .onPublish((message) => {
    const auth = admin.auth();
    const db = admin.firestore();
    return db
      .collectionGroup("members")
      .where("active", "==", true)
      .get()
      .then((snapshot) => {
        console.log(`rewriting oauth claims for ${snapshot.size} users`);
        return snapshot.docs.map((doc) => {
          const member = doc.data();

          // TODO(CD): remove -- for testing
          const TEST_EMAIL = "connor.p.d@gmail.com";
          if (member.email !== TEST_EMAIL) {
            console.debug(`email is not "${TEST_EMAIL}" -- skipping`);
            return;
          }

          return auth.getUserByEmail(member.email).then((userRecord) => {
            const uid = userRecord.uid;
            const oldClaims = userRecord.customClaims;

            if (!oldClaims) {
              console.log(
                `no custom claims found for ${member.email} (${uid}) -- skipping`
              );
              return;
            }

            console.log(
              `found existing custom claims for ${member.email} (${uid})`,
              oldClaims
            );

            if (oldClaims.orgs) {
              console.log(
                "existing claims already contains orgs field -- skipping"
              );
              return;
            }
            const newClaims = Object.assign(oldClaims, {
              orgs: {
                admin: member.admin == true,
              },
            });
            console.log(
              `writing new custom claims for ${member.email} (${uid})`,
              newClaims
            );
            return admin
              .auth()
              .setCustomUserClaims(uid, newClaims)
              .then(() => {
                // Touch the uid record (`/uids/{uid}`) to trigger id
                // token refresh in the client.
                //
                // NOTE: The client refresh trigger subscription is
                //       set up and handled in the WithOauthUser component.
                return db
                  .collection("uids")
                  .doc(uid)
                  .set({
                    refreshTime: admin.firestore.FieldValue.serverTimestamp(),
                  })
                  .then(() => {
                    console.log("done triggering token refresh");
                  });
              });
          });
        });
      });
  });
