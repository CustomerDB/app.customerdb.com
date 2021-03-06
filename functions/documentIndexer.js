// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const admin = require("firebase-admin");
const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const util = require("./util.js");

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;

const ALGOLIA_DOCUMENTS_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.documents_index
  : undefined;

const ALGOLIA_SUMMARIES_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.summaries_index
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

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
                personID: data.personID,
                personName: data.personName,
                personImageURL: data.personImageURL,
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
          personID: data.personID,
          personName: data.personName,
          personImageURL: data.personImageURL,
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

const indexSummary = (index) => {
  return (change, context) => {
    if (!change.after.exists || change.after.data().deletionTimestamp != "") {
      // Delete summary from index;
      console.log("deleting summary from index", context.params.summaryID);
      return index.deleteObject(context.params.summaryID);
    }

    let data = change.after.data();
    let revisionsRef = change.after.ref.collection("revisions");
    let deltasRef = change.after.ref.collection("deltas");

    return latestRevision(revisionsRef).then((oldRevision) => {
      if (data.needsIndex === true) {
        return updateRevision(
          oldRevision.delta,
          oldRevision.timestamp,
          deltasRef
        ).then((newRevision) => {
          // Index the new content
          let indexRecord = {
            // Add an 'objectID' field which Algolia requires
            objectID: change.after.id,
            orgID: context.params.orgID,
            name: data.name,
            createdBy: data.createdBy,
            creationTimestamp: data.creationTimestamp.seconds,
            latestSnapshotTimestamp: newRevision.timestamp.seconds,
            text: util.deltaToPlaintext(newRevision.delta),
          };

          return index.saveObject(indexRecord).then(() => {
            // Write the snapshot, timestamp and index state back to document
            // (but only if the new revision has additional committed deltas
            // since the last revision was computed).

            let writeRevision = Promise.resolve();

            if (
              newRevision.timestamp.toDate().valueOf() >
              oldRevision.timestamp.toDate().valueOf()
            ) {
              console.debug(
                "writing new revision (old ts, new ts)",
                oldRevision.timestamp.toDate().valueOf(),
                newRevision.timestamp.toDate().valueOf()
              );

              writeRevision = revisionsRef.add({
                delta: { ops: newRevision.delta.ops },
                timestamp: newRevision.timestamp,
              });
            }

            writeRevision.then(change.after.ref.update({ needsIndex: false }));
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
        latestSnapshotTimestamp: oldRevision.timestamp.seconds,
        text: util.deltaToPlaintext(oldRevision.delta),
      });
    });
  };
};

// Add summary records to the search index when created or
// when marked for re-index.
if (client) {
  exports.indexUpdatedSummary = functions.firestore
    .document("organizations/{orgID}/summaries/{summaryID}")
    .onWrite(indexSummary(client.initIndex(ALGOLIA_SUMMARIES_INDEX_NAME)));
}

// Cache the person name and image URL in document metadata on update
exports.cachePersonImageURL = functions.firestore
  .document("organizations/{orgID}/documents/{documentID}")
  .onUpdate((change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const docRef = change.after.ref;
    const orgRef = docRef.parent.parent;
    const peopleRef = orgRef.collection("people");

    const personChanged = after.personID !== before.personID;
    const personDetailsMissing =
      !("personName" in after) || !("personImageURL" in after);

    if (personChanged || personDetailsMissing) {
      if (!after.personID) {
        return docRef.update({
          personImageURL: "",
          personName: "",
        });
      }

      return peopleRef
        .doc(after.personID)
        .get()
        .then((doc) => {
          let personImageURL;
          let personName;
          if (doc.exists) {
            const person = doc.data();
            personImageURL = person.imageURL;
            personName = person.name;
          }
          return docRef.update({
            personImageURL: personImageURL || "",
            personName: personName || "",
          });
        });
    }
  });

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

// Mark documents
exports.markSummariesForIndexing = functions.pubsub
  .schedule("every 2 minutes")
  .onRun(markForIndexing("summaries"));
