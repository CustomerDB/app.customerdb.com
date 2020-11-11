const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const { v4: uuidv4 } = require("uuid");
const util = require("./util.js");

const firestore = require("@google-cloud/firestore");
const adminClient = new firestore.v1.FirestoreAdminClient();

admin.initializeApp();

exports.auth = require("./auth");
exports.repairJobs = require("./repairJobs");
exports.highlightIndex = require("./highlightIndexer.js");
exports.video = require("./video");
exports.garbageCollection = require("./garbageCollection");
exports.transcript = require("./transcript");
exports.twilio = require("./twilio");
exports.waitList = require("./waitlist");

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
                    return orgRef.update({
                      defaultTagGroupID: tagGroupID,
                    });
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
      imageURL: person.imageURL,
      creationTimestamp: person.creationTimestamp.seconds,
    };

    // Write to the algolia index
    return index.saveObject(personToIndex);
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
              highlightDoc.ref.update(partialUpdate)
            )
          )
        );
    }
  });

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

const isDocument = (delta) => {
  if (delta.ops.length === 0) {
    return false;
  }
  let result = true;
  for (let i = 0; i < delta.ops.length; i++) {
    let op = delta.ops[i];
    if (!op.insert) {
      result = false;
      break;
    }
  }
  return result;
};

const updateRevision = (revisionDelta, revisionTimestamp, deltasRef) => {
  let result = revisionDelta;
  let timestamp = revisionTimestamp;

  if (!isDocument(revisionDelta)) {
    console.error(
      "Revision delta is not a document ",
      JSON.stringify(revisionDelta)
    );
  }

  return deltasRef
    .where("timestamp", ">", timestamp)
    .orderBy("timestamp", "asc")
    .get()
    .then((deltasSnapshot) => {
      deltasSnapshot.forEach((deltaDoc) => {
        let data = deltaDoc.data();
        result = result.compose(new Delta(data.ops));
        timestamp = data.timestamp;
      });

      if (!isDocument(result)) {
        console.error(
          "New revision delta is not a document ",
          JSON.stringify(result)
        );
      }

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

    return latestRevision(revisionsRef).then((oldNotes) => {
      return latestRevision(transcriptRevisionsRef).then((oldTranscript) => {
        if (data.needsIndex === true) {
          return updateRevision(
            oldNotes.delta,
            oldNotes.timestamp,
            deltasRef
          ).then((newNotes) => {
            updateRevision(
              oldTranscript.delta,
              oldTranscript.timestamp,
              transcriptDeltasRef
            ).then((newTranscript) => {
              // Index the new content
              let docToIndex = {
                // Add an 'objectID' field which Algolia requires
                objectID: change.after.id,
                orgID: context.params.orgID,
                name: data.name,
                createdBy: data.createdBy,
                creationTimestamp: data.creationTimestamp.seconds,
                latestSnapshotTimestamp: maxTimestamp(
                  newNotes.timestamp,
                  newTranscript.timestamp
                ).seconds,
                notesText: util.deltaToPlaintext(newNotes.delta),
                transcriptText: util.deltaToPlaintext(newTranscript.delta),
              };

              return index.saveObject(docToIndex).then(() => {
                // Write the snapshot, timestamp and index state back to document
                // (but only if the new revision has additional committed deltas
                // since the last revision was computed).

                let newNotesRevision = Promise.resolve();
                if (
                  newNotes.timestamp.toDate().valueOf() >
                  oldNotes.timestamp.toDate().valueOf()
                ) {
                  console.debug(
                    "writing new notes revision (old ts, new ts)",
                    oldNotes.timestamp.toDate().valueOf(),
                    newNotes.timestamp.toDate().valueOf()
                  );

                  newNotesRevision = revisionsRef.add({
                    delta: { ops: newNotes.delta.ops },
                    timestamp: newNotes.timestamp,
                  });
                }

                let newTranscriptRevision = Promise.resolve();
                if (
                  newTranscript.timestamp.toDate().valueOf() >
                  oldTranscript.timestamp.toDate().valueOf()
                ) {
                  console.debug(
                    "writing new transcript revision (old ts, new ts)",
                    oldTranscript.timestamp.toDate().valueOf(),
                    newTranscript.timestamp.toDate().valueOf()
                  );
                  newTranscriptRevision = transcriptRevisionsRef.add({
                    delta: { ops: newTranscript.delta.ops },
                    timestamp: newTranscript.timestamp,
                  });
                }

                return Promise.all([
                  newNotesRevision,
                  newTranscriptRevision,
                ]).then(change.after.ref.update({ needsIndex: false }));
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
          latestSnapshotTimestamp: maxTimestamp(
            oldNotes.timestamp,
            oldTranscript.timestamp
          ).seconds,
          notesText: util.deltaToPlaintext(oldNotes.delta),
          transcriptText: util.deltaToPlaintext(oldTranscript.delta),
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
                          return doc.ref.update({ needsIndex: true });
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
                                return doc.ref.update({ needsIndex: true });
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
                                    return doc.ref.update({ needsIndex: true });
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
              doc.ref.update({ personID: newPersonID })
            )
          )
        )
        .then(() =>
          transcriptHighlightsRef
            .get()
            .then((snapshot) =>
              Promise.all(
                snapshot.docs.map((doc) =>
                  doc.ref.update({ personID: newPersonID })
                )
              )
            )
        );
    }
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

                            return doc.ref.update(partialUpdate);
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
                              return tagDoc.ref.update({
                                tagGroupID: tagGroupID,
                                ID: tagDoc.id,
                              });
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
                        return analysisRef.update({
                          documentIDs: newDocumentIDs,
                        });
                      }
                    });
                  })
                )
              );
          })
        )
      );
  });
