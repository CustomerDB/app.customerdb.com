const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const toPlaintext = require("quill-delta-to-plaintext");
const { nanoid } = require("nanoid");

const firestore = require("@google-cloud/firestore");
const adminClient = new firestore.v1.FirestoreAdminClient();

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

    let uid = before && before.uid ? before.uid : after.uid;

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

exports.createOrganization = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  // Only allow quantap accounts to act as super admin.
  if (!context.auth.token.email.endsWith("@quantap.com")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  if (!data.name || !data.email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "name and email arguments required."
    );
  }

  const name = data["name"];
  const email = data["email"];

  let db = admin.firestore();

  // 1) Create organization.
  return db
    .collection("organizations")
    .add({
      name: name,
    })
    .then((doc) => {
      console.debug("Creating first member");
      let orgID = doc.id;
      let orgRef = db.collection("organizations").doc(orgID);

      // 2) Create first member.
      return orgRef
        .collection("members")
        .doc(email)
        .set({
          email: email,
          invited: true,
          active: false,
          admin: true,
          inviteSentTimestamp: "",
          orgID: orgID,
        })
        .then((doc) => {
          console.debug("Creating tag group");
          // 3) Create default tag group
          return orgRef
            .collection("tagGroups")
            .add({
              createdBy: email,
              creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
              deletionTimestamp: "",
              name: "Discovery",
            })
            .then((doc) => {
              let tagGroupID = doc.id;
              let tagGroupRef = orgRef.collection("tagGroups").doc(tagGroupID);

              console.debug("Creating tags");

              let tags = [
                {
                  ID: nanoid(),
                  color: "#d4c4fb",
                  textColor: "#000",
                  name: "Emotion",
                  organizationID: orgID,
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                },
                {
                  ID: nanoid(),
                  color: "#bedadc",
                  textColor: "#000",
                  name: "Deficiency",
                  organizationID: orgID,
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                },
                {
                  ID: nanoid(),
                  color: "#fad0c3",
                  textColor: "#000",
                  name: "Problem",
                  organizationID: orgID,
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                },
                {
                  ID: nanoid(),
                  color: "#fef3bd",
                  textColor: "#000",
                  name: "Action",
                  organizationID: orgID,
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                },
                {
                  ID: nanoid(),
                  color: "#c4def6",
                  textColor: "#000",
                  name: "Cares about",
                  organizationID: orgID,
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                },
              ];

              // 4) Create default tags.
              let tagPromises = tags.map((tag) =>
                tagGroupRef.collection("tags").doc(tag.ID).set(tag)
              );

              return Promise.all(tagPromises).then((doc) => {
                console.debug("Set default tag group");

                // 5) After creating tag group. Set the default tag group.
                return orgRef.set(
                  {
                    defaultTagGroupID: tagGroupID,
                  },
                  { merge: true }
                );
              });
            });
        });
    })
    .then(() => {
      return "OK";
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

const ALGOLIA_PEOPLE_INDEX_NAME = functions.config().algolia.people_index;
const ALGOLIA_DOCUMENTS_INDEX_NAME = functions.config().algolia.documents_index;

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

    let personToIndex = {
      // Add an 'objectID' field which Algolia requires
      objectID: change.after.id,
      orgID: context.params.orgID,
      name: person.name,
      job: person.job,
      labels: person.labels,
      customFields: person.customFields,
      createdBy: person.createdBy,
      creationTimestamp: person.creationTimestamp.seconds,
    };

    // Write to the algolia index
    return index.saveObject(personToIndex);
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
      console.log("deleting document from index", context.params.documentID);
      return index.deleteObject(context.params.documentID);
    }

    return change.after.ref
      .collection("snapshots")
      .orderBy("timestamp", "desc")
      .limit(1)
      .get()
      .then((snapshot) => {
        snapshot.forEach((latestSnapshotDoc) => {
          let snapshotData = latestSnapshotDoc.data();
          let latestSnapshot = new Delta(snapshotData.delta.ops);
          let ts = snapshotData.timestamp;
          if (ts === "") {
            ts = new admin.firestore.Timestamp(0, 0);
          }

          if (data.needsIndex === true) {
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
                  // Add an 'objectID' field which Algolia requires
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

                  return change.after.ref
                    .collection("snapshots")
                    .add({
                      delta: { ops: latestSnapshot.ops },
                      timestamp: ts,
                    })
                    .then(() => {
                      return change.after.ref.set(
                        { needsIndex: false },
                        { merge: true }
                      );
                    });
                });
              });
          }

          // Otherwise, just proceed with updating the index with the
          // existing document data.
          return index.saveObject({
            // Add an 'objectID' field which Algolia requires
            objectID: change.after.id,
            orgID: context.params.orgID,
            name: data.name,
            createdBy: data.createdBy,
            creationTimestamp: data.creationTimestamp.seconds,
            latestSnapshotTimestamp: ts.seconds,
            text: toPlaintext(latestSnapshot),
          });
        });
      });
  });

// Mark documents with edits more recent than the last indexing operation
// for re-indexing.
exports.markDocumentsForIndexing = functions.pubsub
  .schedule("every 2 minutes")
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
                      .collection("snapshots")
                      .orderBy("timestamp", "desc")
                      .limit(1)
                      .get()
                      .then((snapshot) => {
                        snapshot.forEach((latestSnapshotDoc) => {
                          let latestSnapshot = latestSnapshotDoc.data();
                          return doc.ref
                            .collection("deltas")
                            .where("timestamp", ">", latestSnapshot.timestamp)
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
                        });
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

                          mailHtml = mailHtml.replace(
                            "{{baseURL}}",
                            functions.config().invite_email.base_url
                          );
                          mailHtml = mailHtml.replace("{{orgID}}", orgID);

                          mailTxt = mailTxt.replace(
                            "{{baseURL}}",
                            functions.config().invite_email.base_url
                          );
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

//////////////////////////////////////////////////////////////////////////////
//
//   Backup
//
//////////////////////////////////////////////////////////////////////////////
const bucket = functions.config().system.backup_bucket;

exports.scheduledFirestoreExport = functions.pubsub
  .schedule("every 4 hours")
  .onRun((context) => {
    const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const databaseName = adminClient.databasePath(projectId, "(default)");

    console.log("databaseName", databaseName);

    return adminClient
      .exportDocuments({
        name: databaseName,
        outputUriPrefix: bucket,
        // Leave collectionIds empty to export all collections
        // or set to a list of collection IDs to export,
        // collectionIds: ['users', 'posts']
        collectionIds: [],
      })
      .then((responses) => {
        const response = responses[0];
        console.log(`Operation Name: ${response["name"]}`);
      })
      .catch((err) => {
        console.error(err);
        throw new Error("Export operation failed");
      });
  });
