const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const toPlaintext = require("quill-delta-to-plaintext");

admin.initializeApp();

//////////////////////////////////////////////////////////////////////////////
//
//   Authentication
//
//////////////////////////////////////////////////////////////////////////////

// Authentication trigger adds custom claims to the user's auth token
// when members are written
exports.onMemberWritten = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    console.log("handling update (params):", context.params);

    let before = change.before.data();
    let after = change.after.data();

    let uid = before.uid || after.uid;

    if (!uid) {
      console.log("no uid -- terminating");
      return;
    }

    // Remove custom claims if necessary.
    // TODO(CD): only delete claims for this orgID.

    let memberRecordDeleted = !change.after.exists;
    if (memberRecordDeleted) {
      console.log(`member record deleted -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    let memberInactive = !after.active;
    if (memberInactive) {
      console.log(`member is inactive -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    // Add custom claims if necessary.
    // TODO(CD): Make this work for multiple orgs

    let newCustomClaims = {
      orgID: context.params.orgID,
      admin: after.admin,
    };

    console.log(`getting user record ${uid} to read custom claims`);
    return admin
      .auth()
      .getUser(uid)
      .then((userRecord) => {
        let oldClaims = userRecord.customClaims;

        console.log(`found existing custom claims for ${uid}`, oldClaims);

        let missingClaims =
          !oldClaims || !("orgID" in oldClaims) || !("admin" in oldClaims);

        // True if the user is an active org member (should have claims)
        // but does not have claims for any reason.
        let needsClaims = after.active && missingClaims;

        // True if a user is writing their own member uid (join org operation)
        let memberJoined = !before.uid && before.uid !== after.uid;

        // True if the member admin bit changed
        let adminChanged = before.admin !== after.admin;

        if (needsClaims || memberJoined || adminChanged) {
          console.log("writing new custom claims", newCustomClaims);

          // Set custom claims for the user.
          return admin
            .auth()
            .setCustomUserClaims(uid, newCustomClaims)
            .then(() => {
              console.log(`triggering token refresh for /uids/${uid}`);
              // Touch the uid record (`/uids/{uid}`) to trigger id
              // token refresh in the client.
              //
              // NOTE: The client refresh trigger subscription is
              //       set up and handled in the WithOauthUser component.
              return admin
                .firestore()
                .collection("uids")
                .doc(uid)
                .set({
                  refreshTime: admin.firestore.FieldValue.serverTimestamp(),
                })
                .then(() => {
                  console.log("done triggering token refresh");
                });
            });
        }
      });
  });

//////////////////////////////////////////////////////////////////////////////
//
//   Search
//
//////////////////////////////////////////////////////////////////////////////

const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key;

const ALGOLIA_PEOPLE_INDEX_NAME = "prod_PEOPLE";
const ALGOLIA_DOCUMENTS_INDEX_NAME = "prod_DOCUMENTS";

const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

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

  let orgID = context.auth.token.orgID;
  if (!orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "user organization not found"
    );
  }

  // Create the params object as described in the Algolia documentation:
  // https://www.algolia.com/doc/guides/security/api-keys/#generating-api-keys
  const params = {
    // This filter ensures that only items where orgID == user's
    // org ID are readable.
    filters: `orgID:${orgID}`,
    // We also proxy the token uid as a unique token for this key.
    userToken: context.auth.uid,
  };

  // Call the Algolia API to generate a unique key based on our search key
  const key = client.generateSecuredApiKey(ALGOLIA_SEARCH_KEY, params);

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

// Add people records to the search index when created or updated.
exports.onPersonWritten = functions.firestore
  .document("organizations/{orgID}/people/{personID}")
  .onWrite((change, context) => {
    const index = client.initIndex(ALGOLIA_PEOPLE_INDEX_NAME);

    if (!change.after.exists || change.after.data().deletionTimestamp != "") {
      // Delete person from index;
      index.deleteObject(context.params.personID);
      return;
    }

    let person = change.after.data();

    // Get the note document
    // Add an 'objectID' field which Algolia requires
    person.objectID = context.params.personID;

    // Insert org ID into indexed object.
    person.orgID = context.params.orgID;

    // Write to the algolia index
    return index.saveObject(person);
  });

// Add document records to the search index when created or
// when marked for re-index.
exports.onDocumentWritten = functions.firestore
  .document("organizations/{orgID}/documents/{documentID}")
  .onWrite((change, context) => {
    const index = client.initIndex(ALGOLIA_DOCUMENTS_INDEX_NAME);

    let data = change.after.data();

    if (!change.after.exists || data.deletionTimestamp != "") {
      // Delete document from index;
      return index.deleteObject(context.params.documentID);
    }

    let latestSnapshot = new Delta(data.latestSnapshot.ops);

    if (data.needsIndex === true) {
      let ts = data.latestSnapshotTimestamp;
      if (ts === "") {
        ts = new admin.firestore.Timestamp(0, 0);
      }
      return change.after.ref
        .collection("deltas")
        .where("timestamp", ">", ts)
        .get()
        .then((deltasSnapshot) => {
          deltasSnapshot.forEach((deltaDoc) => {
            let delta = deltaDoc.data();
            let ops = delta.ops;
            latestSnapshot = latestSnapshot.compose(new Delta(ops));
            ts = delta.timestamp;
          });

          // Convert the consolidated document delta snapshot to text.
          let docText = toPlaintext(latestSnapshot);

          // Index the new content
          let docToIndex = {
            objectID: change.after.id,
            orgID: context.params.orgID,
            name: data.name,
            createdBy: data.createdBy,
            creationTimestamp: data.creationTimestamp.seconds,
            latestSnapshotTimestamp: ts.seconds,
            text: docText,
          };

          return index.saveObject(docToIndex).then(() => {
            // Write the snapshot, timestamp and index state back to document
            return change.after.ref.set(
              {
                latestSnapshot: {
                  ops: latestSnapshot.ops,
                },
                latestSnapshotTimestamp: ts,
                needsIndex: false,
              },
              { merge: true }
            );
          });
        });
    }

    // Otherwise, just proceed with updating the index with the
    // existing document data.
    return index.saveObject({
      objectID: change.after.id,
      orgID: context.params.orgID,
      name: data.name,
      createdBy: data.createdBy,
      creationTimestamp: data.creationTimestamp,
      latestSnapshotTimestamp: data.latestSnapshotTimestamp.seconds,
      text: toPlaintext(latestSnapshot),
    });
  });

// Mark documents with edits more recent than the last indexing operation
// for re-indexing.
exports.markDocumentsForIndexing = functions.pubsub
  .schedule("every 5 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        // Iterate all organizations
        return Promise.all(
          orgsSnapshot.docs.map((orgsSnapshot) => {
            // Look at documents not currently marked for indexing
            // that have not been marked for deletion.
            return orgsSnapshot.ref
              .collection("documents")
              .where("needsIndex", "==", false)
              .where("deletionTimestamp", "==", "")
              .get()
              .then((docsSnapshot) => {
                return Promise.all(
                  docsSnapshot.docs.map((doc) => {
                    // Look for any deltas that were written after the
                    // last indexed timestamp.
                    return doc.ref
                      .collection("deltas")
                      .where(
                        "timestamp",
                        ">",
                        doc.data().latestSnapshotTimestamp
                      )
                      .get()
                      .then((deltas) => {
                        if (deltas.size > 0) {
                          // Mark this document for indexing
                          return doc.ref.set(
                            { needsIndex: true },
                            { merge: true }
                          );
                        }
                      });
                  })
                );
              });
          })
        );
      });
  });

//////////////////////////////////////////////////////////////////////////////
//
//   New user invitations
//
//////////////////////////////////////////////////////////////////////////////

exports.emailInviteJob = functions.pubsub
  .schedule("every 5 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    db.collection("organizations")
      .get()
      .then((snapshot) => {
        let organizationPromises = [];
        console.log("Snapshot size", snapshot.size);
        snapshot.forEach((doc) => {
          let orgID = doc.id;

          organizationPromises.push(
            new Promise((accept, reject) => {
              let memberPromises = [];

              // list member collections to get.
              memberPromises.push(
                db
                  .collection("organizations")
                  .doc(orgID)
                  .collection("members")
                  .where("invited", "==", true)
                  .where("active", "==", false)
                  .where("inviteSentTimestamp", "==", "")
                  .get()
                  .then((snapshot) => {
                    let mailPromises = [];

                    snapshot.forEach((doc) => {
                      mailPromises.push(
                        new Promise((accept, reject) => {
                          let member = doc.data();

                          console.log("Sending email to ", member);

                          let mailHtml = fs.readFileSync(
                            "mail_templates/invite_mail.html",
                            "utf8"
                          );
                          let mailTxt = fs.readFileSync(
                            "mail_templates/invite_mail.txt",
                            "utf8"
                          );

                          mailHtml = mailHtml.replace("{{orgID}}", orgID);
                          mailTxt = mailTxt.replace("{{orgID}}", orgID);

                          sgMail.setApiKey(functions.config().sendgrid.api_key);
                          const msg = {
                            to: member.email,
                            from: "noreply@quantap.com",
                            subject:
                              "You have been invited to join a team on CustomerDB",
                            text: mailTxt,
                            html: mailHtml,
                          };
                          sgMail.send(msg);

                          doc.ref
                            .set(
                              {
                                inviteSentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                              },
                              { merge: true }
                            )
                            .then(() => {
                              // accept
                              accept();
                            })
                            .catch((e) => {
                              reject(e);
                            });
                        })
                      );
                    });

                    console.log(
                      "Waiting for ",
                      mailPromises.length,
                      " mail promises"
                    );
                    return Promise.all(mailPromises)
                      .then(() => accept())
                      .catch((e) => {
                        reject(e);
                      });
                  })
              );

              console.log(
                "Waiting for ",
                memberPromises.length,
                " member promises"
              );
              return Promise.all(memberPromises)
                .then(() => accept())
                .catch((e) => {
                  reject(e);
                });
            })
          );
        });

        console.log(
          "Waiting for ",
          organizationPromises.length,
          " organization promises"
        );
        return Promise.all(organizationPromises);
      })
      .then(() => {
        console.log("Job finished");
      })
      .catch((e) => {
        console.log(e);
      });
  });
