const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const { v4: uuidv4 } = require("uuid");
const Video = require("@google-cloud/video-intelligence").v1p3beta1;
const tmp = require("tmp");

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

    const orgID = context.params.orgID;
    const email = context.params.email;
    let before = change.before.data();
    let after = change.after.data();

    let uid = before && before.uid ? before.uid : after && after.uid;

    let uidPromise;

    // Populate member with uid, if it can be found.
    if (!uid) {
      console.debug("No UID found. Trying to fetch and populate");
      uidPromise = admin
        .auth()
        .getUserByEmail(email)
        .then((userRecord) => {
          console.log("userRecord: ", JSON.stringify(userRecord));
          let uid = userRecord.uid;
          let db = admin.firestore();
          let orgRef = db.collection("organizations").doc(orgID);
          let memberRef = orgRef.collection("members").doc(email);

          return memberRef
            .set(
              {
                uid: uid,
              },
              { merge: true }
            )
            .then(() => {
              return db.collection("userToOrg").doc(email).set(
                {
                  orgID: orgID,
                },
                { merge: true }
              );
            })
            .then(() => {
              return uid;
            });
        });
    } else {
      uidPromise = Promise.resolve(uid);
    }

    uidPromise.then((uid) => {
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
          console.log("Before: ", before);
          console.log("After: ", after);
          let memberJoined =
            !before || (!before.uid && before.uid !== after.uid);

          // True if the member admin bit changed
          let adminChanged = !before || before.admin !== after.admin;

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

  const rawdata = fs.readFileSync("data/default_tags.json");
  const defaultTags = JSON.parse(rawdata);

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
          console.debug("Creating tag groups");
          // 3) Create default tag group

          return Promise.all(
            defaultTags["tagGroups"].map((tagGroup) => {
              return orgRef
                .collection("tagGroups")
                .add({
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                  name: tagGroup["name"],
                })
                .then((doc) => {
                  let tagGroupID = doc.id;
                  let tagGroupRef = orgRef
                    .collection("tagGroups")
                    .doc(tagGroupID);

                  console.debug("Creating tags");

                  // 4) Create default tags.
                  let tagPromises = tagGroup["tags"].map((tag) => {
                    let tagDocument = {
                      ID: uuidv4(),
                      color: tag.color,
                      textColor: tag.textColor,
                      name: tag.name,
                      organizationID: orgID,
                      createdBy: email,
                      tagGroupID: tagGroupID,
                      creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                      deletionTimestamp: "",
                    };
                    tagGroupRef
                      .collection("tags")
                      .doc(tagDocument.ID)
                      .set(tagDocument);
                  });

                  return Promise.all(tagPromises).then(() => {
                    if (!tagGroup.default) {
                      return;
                    }

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
            })
          );
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

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;
const ALGOLIA_SEARCH_KEY = functions.config().algolia
  ? functions.config().algolia.search_key
  : undefined;

const ALGOLIA_PEOPLE_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.people_index
  : undefined;
const ALGOLIA_DOCUMENTS_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.documents_index
  : undefined;
const ALGOLIA_SNAPSHOTS_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.snapshots_index
  : undefined;
const ALGOLIA_HIGHLIGHTS_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.highlights_index
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

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
      creationTimestamp: person.creationTimestamp.seconds,
    };

    // Write to the algolia index
    return index.saveObject(personToIndex);
  });

// Add highlight records to the search index when created, updated or deleted.
exports.onHighlightWritten = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}"
  )
  .onWrite((change, context) => {
    if (!client) {
      console.warn("Algolia client not available; skipping index operation");
      return;
    }
    const index = client.initIndex(ALGOLIA_HIGHLIGHTS_INDEX_NAME);
    if (!change.after.exists || change.after.data().deletionTimestamp != "") {
      // Delete highlight from index;
      index.deleteObject(context.params.highlightID);
      return;
    }

    let highlight = change.after.data();

    let highlightToIndex = {
      // Add an 'objectID' field which Algolia requires
      objectID: change.after.id,
      orgID: context.params.orgID,
      documentID: highlight.documentID,
      personID: highlight.personID,
      text: highlight.text,
      tagID: highlight.tagID,
      createdBy: highlight.createdBy,
      creationTimestamp: highlight.creationTimestamp.seconds,
      lastUpdateTimestamp: highlight.lastUpdateTimestamp.seconds,
    };

    // Write to the algolia index
    return index.saveObject(highlightToIndex);
  });

// Update highlight records when document personID is updated.
exports.updateHighlightsForUpdatedDocument = functions.firestore
  .document("organizations/{orgID}/documents/{documentID}")
  .onUpdate((change, context) => {
    let before = change.before.data();
    let after = change.after.data();

    let partialUpdate = {};

    if (before.deletionTimestamp != after.deletionTimestamp) {
      partialUpdate.deletionTimestamp = after.deletionTimestamp;
    }

    if (before.personID != after.personID) {
      partialUpdate.personID = after.personID;
    }

    if (Object.keys(partialUpdate).length > 0) {
      return change.after.ref
        .collection("highlights")
        .get()
        .then((snapshot) =>
          Promise.all(
            snapshot.docs.map((highlightDoc) =>
              highlightDoc.ref.set(partialUpdate, { merge: true })
            )
          )
        );
    }
  });

const deltaToPlaintext = (delta) => {
  return delta.reduce(function (text, op) {
    if (!op.insert) return text;
    if (typeof op.insert !== "string") return text + " ";
    return text + op.insert;
  }, "");
};

const latestRevision = (collectionRef) => {
  return collectionRef
    .orderBy("timestamp", "desc")
    .limit(1)
    .get()
    .then((snapshot) => {
      if (snapshot.size === 0) {
        return {
          delta: new Delta([{ insert: "\n" }]),
          timestamp: new admin.firestore.Timestamp(0, 0),
        };
      }
      let data = snapshot.docs[0].data();
      return {
        delta: new Delta(data.delta.ops),
        timestamp: data.timestamp,
      };
    });
};

const updateRevision = (revisionDelta, revisionTimestamp, deltasRef) => {
  let result = revisionDelta;
  let timestamp = revisionTimestamp;

  return deltasRef
    .where("timestamp", ">", timestamp)
    .get()
    .then((deltasSnapshot) => {
      deltasSnapshot.forEach((deltaDoc) => {
        let data = deltaDoc.data();
        result = result.compose(new Delta(data.ops));
        timestamp = data.timestamp;
      });
      return {
        delta: result,
        timestamp: timestamp,
      };
    });
};

const maxTimestamp = (a, b) => {
  let result = a;
  if (b.valueOf() > a.valueOf()) {
    result = b;
  }
  return result;
};

const indexUpdated = (index) => {
  return (change, context) => {
    if (!change.after.exists || change.after.data().deletionTimestamp != "") {
      // Delete document from index;
      console.log("deleting document from index", context.params.documentID);
      return index.deleteObject(context.params.documentID);
    }

    let data = change.after.data();
    let revisionsRef = change.after.ref.collection("revisions");
    let deltasRef = change.after.ref.collection("deltas");
    let transcriptRevisionsRef = change.after.ref.collection(
      "transcriptRevisions"
    );
    let transcriptDeltasRef = change.after.ref.collection("transcriptDeltas");

    return latestRevision(revisionsRef).then((notes) => {
      return latestRevision(transcriptRevisionsRef).then((transcript) => {
        if (data.needsIndex === true) {
          return updateRevision(notes.delta, notes.timestamp, deltasRef).then(
            (notes) => {
              updateRevision(
                transcript.delta,
                transcript.timestamp,
                transcriptDeltasRef
              ).then((transcript) => {
                // Index the new content
                let docToIndex = {
                  // Add an 'objectID' field which Algolia requires
                  objectID: change.after.id,
                  orgID: context.params.orgID,
                  name: data.name,
                  createdBy: data.createdBy,
                  creationTimestamp: data.creationTimestamp.seconds,
                  latestSnapshotTimestamp: maxTimestamp(
                    notes.timestamp,
                    transcript.timestamp
                  ).seconds,
                  notesText: deltaToPlaintext(notes.delta),
                  transcriptText: deltaToPlaintext(transcript.delta),
                };

                return index.saveObject(docToIndex).then(() => {
                  // Write the snapshot, timestamp and index state back to document

                  return revisionsRef
                    .add({
                      delta: { ops: notes.delta.ops },
                      timestamp: notes.timestamp,
                    })
                    .then(() => {
                      transcriptRevisionsRef.add({
                        delta: { ops: transcript.delta.ops },
                        timestamp: transcript.timestamp,
                      });
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
          );
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
          latestSnapshotTimestamp: maxTimestamp(
            notes.timestamp,
            transcript.timestamp
          ).seconds,
          notesText: deltaToPlaintext(notes.delta),
          transcriptText: deltaToPlaintext(transcript.delta),
        });
      });
    });
  };
};

// Add document records to the search index when created or
// when marked for re-index.
if (client) {
  exports.indexUpdatedDocument = functions.firestore
    .document("organizations/{orgID}/documents/{documentID}")
    .onWrite(indexUpdated(client.initIndex(ALGOLIA_DOCUMENTS_INDEX_NAME)));
}

// Add snapshot records to the search index when created or
// when marked for re-index.
if (client) {
  exports.indexUpdatedSnapshot = functions.firestore
    .document("organizations/{orgID}/snapshots/{documentID}")
    .onWrite(indexUpdated(client.initIndex(ALGOLIA_SNAPSHOTS_INDEX_NAME)));
}

// Mark documents with edits more recent than the last indexing operation
// for re-indexing.
const markForIndexing = (collectionName) => {
  return (context) => {
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
              .collection(collectionName)
              .where("needsIndex", "==", false)
              .where("deletionTimestamp", "==", "")
              .get()
              .then((docsSnapshot) => {
                return Promise.all(
                  docsSnapshot.docs.map((doc) => {
                    // Look for any deltas that were written after the
                    // last indexed timestamp.
                    return doc.ref
                      .collection("revisions")
                      .orderBy("timestamp", "desc")
                      .limit(1)
                      .get()
                      .then((snapshot) => {
                        if (snapshot.size === 0) {
                          return doc.ref.set(
                            { needsIndex: true },
                            { merge: true }
                          );
                        }

                        snapshot.forEach((latestRevisionDoc) => {
                          let latestRevision = latestRevisionDoc.data();
                          return doc.ref
                            .collection("deltas")
                            .where("timestamp", ">", latestRevision.timestamp)
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
                      })
                      .then(
                        doc.ref
                          .collection("transcriptRevisions")
                          .orderBy("timestamp", "desc")
                          .limit(1)
                          .get()
                          .then((snapshot) => {
                            snapshot.forEach((latestRevisionDoc) => {
                              let latestRevision = latestRevisionDoc.data();
                              return doc.ref
                                .collection("transcriptDeltas")
                                .where(
                                  "timestamp",
                                  ">",
                                  latestRevision.timestamp
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
                            });
                          })
                      );
                  })
                );
              });
          })
        );
      });
  };
};

// Mark documents
exports.markDocumentsForIndexing = functions.pubsub
  .schedule("every 2 minutes")
  .onRun(markForIndexing("documents"));

// Mark snapshots
exports.markSnapshotsForIndexing = functions.pubsub
  .schedule("every 2 minutes")
  .onRun(markForIndexing("snapshots"));

// Update highlights if an interview's personID changes.
exports.updateHighlightPeopleForDocument = functions.firestore
  .document("organizations/{orgID}/documents/{documentID}")
  .onUpdate((change) => {
    let documentRef = change.after.ref;
    let highlightsRef = documentRef.collection("highlights");
    let transcriptHighlightsRef = documentRef.collection(
      "transcriptHighlights"
    );

    let before = change.before.data();
    let after = change.after.data();

    if (before.personID !== after.personID) {
      let newPersonID = after.personID || "";

      return highlightsRef
        .get()
        .then((snapshot) =>
          Promise.all(
            snapshot.docs.map((doc) =>
              doc.ref.set(
                {
                  personID: newPersonID,
                },
                { merge: true }
              )
            )
          )
        )
        .then(() =>
          transcriptHighlightsRef.get().then((snapshot) =>
            Promise.all(
              snapshot.docs.map((doc) =>
                doc.ref.set(
                  {
                    personID: newPersonID,
                  },
                  { merge: true }
                )
              )
            )
          )
        );
    }
  });

//////////////////////////////////////////////////////////////////////////////
//
//   New user invitations
//
//////////////////////////////////////////////////////////////////////////////

exports.emailInviteJob = functions.pubsub
  .schedule("every 2 minutes")
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

exports.highlightRepair = functions.pubsub
  .schedule("every 4 hours")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((orgDoc) => {
            console.log(`Repairing highlights in org ${orgDoc.id}`);
            return orgDoc.ref
              .collection("documents")
              .get()
              .then((snapshot) => {
                return Promise.all(
                  snapshot.docs.map((doc) => {
                    let document = doc.data();
                    let deletionTimestamp = document.deletionTimestamp;

                    return doc.ref
                      .collection("highlights")
                      .get()
                      .then((snapshot) => {
                        return Promise.all(
                          snapshot.docs.map((doc) => {
                            let partialUpdate = {
                              deletionTimestamp: deletionTimestamp,
                            };

                            if (document.personID) {
                              partialUpdate.personID = document.personID;
                            }

                            return doc.ref.set(partialUpdate, { merge: true });
                          })
                        );
                      });
                  })
                );
              });
          })
        );
      });
  });

exports.tagRepair = functions.pubsub
  .schedule("every 4 hours")
  .onRun((context) => {
    let db = admin.firestore();

    // Per organization
    return db
      .collection("organizations")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((orgDoc) => {
            // Go through each tag group
            return orgDoc.ref
              .collection("tagGroups")
              .get()
              .then((snapshot) => {
                return Promise.all(
                  snapshot.docs.map((tagGroupDoc) => {
                    // Go through each tag
                    const tagGroupID = tagGroupDoc.id;
                    return tagGroupDoc.ref
                      .collection("tags")
                      .get()
                      .then((snapshot) => {
                        return Promise.all(
                          snapshot.docs.map((tagDoc) => {
                            // Set tag group id if not already set
                            let tag = tagDoc.data();
                            if (
                              tag.tagGroupID !== tagGroupID ||
                              tag.ID !== tagDoc.id
                            ) {
                              return tagDoc.ref.set(
                                {
                                  tagGroupID: tagGroupID,
                                  ID: tagDoc.id,
                                },
                                { merge: true }
                              );
                            }
                          })
                        );
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
//   Transcription functions
//
//////////////////////////////////////////////////////////////////////////////

exports.startTranscription = functions.storage
  .object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

    console.log(`bucket ${fileBucket} path ${filePath} type ${contentType}`);
    const video = new Video.VideoIntelligenceServiceClient();

    let matches = filePath.match(/(.+)\/transcriptions\/(.+)\/input\/(.+)/);

    if (!matches || matches.length != 4) {
      console.log(
        "File path doesn't match pattern for starting transcription: ",
        filePath
      );
      return;
    }

    let orgID = matches[1];
    let transcriptionID = matches[2];
    let fileName = matches[3];

    // Get transcription operation to get metadata for the transcription request.
    let db = admin.firestore();
    let transcriptionsRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("transcriptions");
    let transcriptionRef = transcriptionsRef.doc(transcriptionID);

    return transcriptionRef.get().then(async (doc) => {
      if (!doc.exists) {
        console.log(
          `Couldn't find transcription operation for organization ${orgID} transcription ${transcriptionID} file ${fileName}`
        );
        return;
      }

      let transcriptionOperation = doc.data();

      const request = {
        inputUri: "gs://" + fileBucket + "/" + filePath,
        features: ["SPEECH_TRANSCRIPTION"],
        videoContext: {
          speechTranscriptionConfig: {
            languageCode: "en-US",
            enableAutomaticPunctuation: true,
            enableSpeakerDiarization: true,
            diarizationSpeakerCount: transcriptionOperation.speakers,
            model: "video",
            useEnhanced: true,
          },
        },
      };

      const [operation] = await video.annotateVideo(request);

      return doc.ref.set(
        {
          status: "pending",
          gcpOperationName: operation.name,
        },
        { merge: true }
      );
    });
  });

// Check every minute for videos in progress
// We have to do this on a schedule as a transcription may take a long time to process.
exports.transcriptionProgress = functions.pubsub
  .schedule("every 1 minutes")
  .onRun((context) => {
    const video = new Video.VideoIntelligenceServiceClient();
    const db = admin.firestore();

    let transcriptionsRef = db.collectionGroup("transcriptions");
    return transcriptionsRef
      .where("deletionTimestamp", "==", "")
      .where("status", "==", "pending")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((doc) => {
            let operation = doc.data();

            return video
              .checkAnnotateVideoProgress(operation.gcpOperationName)
              .then((gcpOperation) => {
                if (gcpOperation.done) {
                  let result = gcpOperation.result.annotationResults[0].toJSON();
                  let bucket = admin.storage().bucket();

                  const outputPath = `${operation.orgID}/transcriptions/${doc.id}/output/transcript.json`;
                  const tmpobj = tmp.fileSync();

                  fs.writeFileSync(tmpobj.name, JSON.stringify(result));

                  return bucket
                    .upload(tmpobj.name, {
                      destination: outputPath,
                    })
                    .then(() => {
                      return doc.ref.set(
                        {
                          status: "finished",
                          outputPath: outputPath,
                        },
                        { merge: true }
                      );
                    });
                } else {
                  let progress = gcpOperation.metadata.annotationProgress[0].toJSON();
                  if (progress.progressPercent) {
                    return doc.ref.set(
                      {
                        status: "pending",
                        progress: progress.progressPercent,
                      },
                      { merge: true }
                    );
                  }
                }
              });
          })
        );
      });
  });

const createRevisionAndTimecodesForTranscript = (outputPath) => {
  const tmpobj = tmp.fileSync();
  return admin
    .storage()
    .bucket()
    .file(outputPath)
    .download({
      destination: tmpobj.name,
    })
    .then(() => {
      let transcriptionJson = JSON.parse(fs.readFileSync(tmpobj.name));

      let alternatives = transcriptionJson["speechTranscriptions"];
      let lastSpeaker;

      let ops = [];
      let timecodes = [];

      let deltaOffset = 0;

      alternatives.forEach((alternative) => {
        let words = alternative["alternatives"][0]["words"];
        if (!words) {
          return;
        }

        words.forEach((word) => {
          if (!Object.keys(word).includes("speakerTag")) {
            return;
          }

          let speakerTag = word["speakerTag"];
          if (speakerTag != lastSpeaker) {
            lastSpeaker = speakerTag;
            let speakerPrefix = `\nSpeaker ${lastSpeaker} `;
            deltaOffset += speakerPrefix.length;
            ops.push({
              insert: speakerPrefix,
              attributes: { bold: true },
            });
          }

          let transcriptWord = word.word + " ";
          ops.push({ insert: transcriptWord });

          let startIndex = deltaOffset;
          deltaOffset += transcriptWord.length;
          let endIndex = deltaOffset - 1;

          let startTime = parseInt(word.startTime.seconds);
          if (word.startTime.nanos) {
            startTime += word.startTime.nanos / 1e9;
          }
          let endTime = parseInt(word.endTime.seconds);
          if (word.endTime.nanos) {
            endTime += word.endTime.nanos / 1e9;
          }

          timecodes.push([startTime, endTime, startIndex, endIndex]);
        });
      });

      return {
        revision: new Delta(ops),
        timecodes: timecodes,
      };
    });
};

// Create delta for completed transcription
exports.deltaForTranscript = functions.firestore
  .document("organizations/{orgID}/transcriptions/{transcriptionID}")
  .onUpdate((change, context) => {
    // If operation changed from pending to finished.
    let before = change.before.data();
    let after = change.after.data();
    if (!(before.status == "pending" && after.status == "finished")) {
      return;
    }

    let operation = after;

    return createRevisionAndTimecodesForTranscript(operation.outputPath).then(
      ({ revision, timecodes }) => {
        // Write to document.
        const db = admin.firestore();
        let documentsRef = db
          .collection("organizations")
          .doc(context.params.orgID)
          .collection("documents");
        let documentRef = documentsRef.doc(operation.documentID);
        let revisionsRef = documentRef.collection("transcriptRevisions");

        let revisionID = uuidv4();

        let timecodesPath = `${context.params.orgID}/transcriptions/${context.params.transcriptionID}/output/timecodes-${revisionID}.json`;

        revisionsRef
          .doc(revisionID)
          .set({
            delta: {
              ops: revision.ops,
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
          .then(() => {
            const tmpobj = tmp.fileSync();
            fs.writeFileSync(tmpobj.name, JSON.stringify(timecodes));
            return admin.storage().bucket().upload(tmpobj.name, {
              destination: timecodesPath,
            });
          })
          .then(() => {
            return change.after.ref.set(
              {
                timecodesPath: timecodesPath,
              },
              { merge: true }
            );
          })
          .then(() => {
            // Lastly, unlock the document.
            return documentRef.set(
              {
                pending: false,
              },
              { merge: true }
            );
          });
      }
    );
  });

exports.transcriptRepair = functions.pubsub
  .topic("transcript-repair")
  .onPublish((message) => {
    const db = admin.firestore();
    let transcriptionsRef = db.collectionGroup("transcriptions");

    return transcriptionsRef
      .where("deletionTimestamp", "==", "")
      .where("status", "==", "finished")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((doc) => {
            let transcriptionRef = doc.ref;
            let transcriptionID = doc.id;
            let { orgID, documentID, outputPath, timecodesPath } = doc.data();
            if (timecodesPath) {
              // This transcription already has the timecodes file.
              return;
            }

            let orgRef = db.collection("organizations").doc(orgID);
            let documentRef = orgRef.collection("documents").doc(documentID);
            let revisionsRef = documentRef.collection("transcriptRevisions");
            return revisionsRef
              .where("timestamp", ">", new admin.firestore.Timestamp(0, 0))
              .orderBy("timestamp", "asc")
              .limit(1)
              .get()
              .then((snapshot) => {
                if (snapshot.empty) {
                  return;
                }
                let revisionID = snapshot.docs[0].id;
                let timecodesPath = `${orgID}/transcriptions/${transcriptionID}/output/timecodes-${revisionID}.json`;
                return createRevisionAndTimecodesForTranscript(outputPath).then(
                  ({ timecodes }) => {
                    const tmpobj = tmp.fileSync();
                    fs.writeFileSync(tmpobj.name, JSON.stringify(timecodes));
                    return admin
                      .storage()
                      .bucket()
                      .upload(tmpobj.name, {
                        destination: timecodesPath,
                      })
                      .then(() => {
                        return transcriptionRef.set(
                          {
                            timecodesPath: timecodesPath,
                          },
                          { merge: true }
                        );
                      });
                  }
                );
              });
          })
        );
      });
  });

// Migrate deltas, revisions and highlights for existing transcripts.
exports.migrateTranscripts = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
  })
  .pubsub.topic("migrate-transcripts")
  .onPublish((message) => {
    const db = admin.firestore();

    const copyCollection = (oldColRef, newColRef) => {
      return oldColRef
        .get()
        .then((snapshot) =>
          Promise.all(
            snapshot.docs.map((d) => newColRef.doc(d.id).set(d.data()))
          )
        );
    };

    let transcriptDocumentsRef = db
      .collectionGroup("documents")
      .where("deletionTimestamp", "==", "") // exclude deleted documents
      .orderBy("transcription"); // exclude documents without this field

    return transcriptDocumentsRef.get().then((snapshot) =>
      Promise.all(
        snapshot.docs.map((doc) => {
          // Skip this document if it does not have a transcription
          if (doc.data().transcription === "") {
            console.debug(
              "skipping document because transcription field is empty",
              doc.id
            );
            return;
          }

          let oldDeltas = doc.ref.collection("deltas");
          let newDeltas = doc.ref.collection("transcriptDeltas");

          let oldRevisions = doc.ref.collection("revisions");
          let newRevisions = doc.ref.collection("transcriptRevisions");

          let oldHighlights = doc.ref.collection("highlights");
          let newHighlights = doc.ref.collection("transcriptHighlights");

          return newRevisions.get().then((newRevisionsSnapshot) => {
            return oldRevisions.get().then((oldRevisionsSnapshot) => {
              if (newRevisionsSnapshot.size === oldRevisionsSnapshot.size) {
                console.debug(
                  "skipping document because it already has migrated revisions",
                  doc.id
                );
                return;
              }

              return copyCollection(oldDeltas, newDeltas)
                .then(() => {
                  return copyCollection(oldHighlights, newHighlights);
                })
                .then(() => {
                  return copyCollection(oldRevisions, newRevisions);
                });
            });
          });
        })
      )
    );
  });

// Remove deleted documents from analysis
exports.repairAnalysis = functions.pubsub
  .schedule("every 5 minutes")
  .onRun((context) => {
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) =>
        Promise.all(
          snapshot.docs.map((doc) => {
            let orgID = doc.id;
            let orgRef = db.collection("organizations").doc(orgID);
            let analysesRef = orgRef.collection("analyses");
            let documentsRef = orgRef.collection("documents");

            return analysesRef
              .where("deletionTimestamp", "==", "")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let analysisRef = doc.ref;
                    let analysis = doc.data();

                    if (
                      !analysis.documentIDs ||
                      analysis.documentIDs.length === 0
                    ) {
                      return;
                    }

                    let analysisDocsRef = documentsRef.where(
                      "ID",
                      "in",
                      analysis.documentIDs
                    );

                    return analysisDocsRef.get().then((snapshot) => {
                      let needsUpdate = false;
                      let newDocumentIDs = [];

                      snapshot.docs.forEach((doc) => {
                        let document = doc.data();
                        if (document.deletionTimestamp !== "") {
                          needsUpdate = true;
                          return;
                        }
                        newDocumentIDs.push(doc.id);
                      });

                      if (needsUpdate) {
                        return analysisRef.set(
                          {
                            documentIDs: newDocumentIDs,
                          },
                          { merge: true }
                        );
                      }
                    });
                  })
                )
              );
          })
        )
      );
  });
