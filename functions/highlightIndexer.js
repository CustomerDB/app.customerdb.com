const admin = require("firebase-admin");
const firestore = require("@google-cloud/firestore");
const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");
const IntervalTree = require("@flatten-js/interval-tree").default;
const transcript = require("./transcript/timecodes.js");
const Delta = require("quill-delta");
const tmp = require("tmp");
const fs = require("fs");

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;
const ALGOLIA_HIGHLIGHTS_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.highlights_index
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

// Returns the JSON contents of the supplied timecode storage path
const getTimecodes = (timecodePath) => {
  const tmpobj = tmp.fileSync();
  return admin
    .storage()
    .bucket()
    .file(timecodePath)
    .download({
      destination: tmpobj.name,
    })
    .then(() => {
      return JSON.parse(fs.readFileSync(tmpobj.name));
    });
};

// Add highlight records to the search index when created, updated or deleted.
function indexHighlight(source, orgID, highlightID, highlightRef) {
  if (!client) {
    console.warn("Algolia client not available; skipping index operation");
    return;
  }
  const index = client.initIndex(ALGOLIA_HIGHLIGHTS_INDEX_NAME);
  if (!highlightRef.exists || highlightRef.data().deletionTimestamp != "") {
    console.debug(
      "document for highlight does not exist; deleting highlight from index"
    );
    // Delete highlight from index;
    index.deleteObject(highlightID);
    return;
  }

  let highlight = highlightRef.data();

  // TODO: Check for presense of lastIndexTimestamp and indexRequestedTimestamp.
  if (
    highlight.lastIndexTimestamp &&
    highlight.indexRequestedTimestamp &&
    highlight.lastIndexTimestamp.toDate().valueOf() >
      highlight.indexRequestedTimestamp.toDate().valueOf()
  ) {
    console.log(
      `skipping indexing highlight ${highlightID} as it was indexed after index requested`
    );
    return;
  }

  let db = admin.firestore();
  let documentRef = db
    .collection("organizations")
    .doc(orgID)
    .collection("documents")
    .doc(highlight.documentID);

  return documentRef.get().then((doc) => {
    if (!doc.exists) {
      console.warn(
        `Document ${documentID} not found in org ${orgID} -- skipping index`
      );
      return;
    }
    let document = doc.data();
    if (document.deletionTimestamp !== "") {
      console.debug(
        "document for highlight is deleted; deleting highlight from index"
      );
      // Delete highlight from index;
      index.deleteObject(highlightID);
      return;
    }

    // If the document has a transcription field, we should look for the presence.
    let transcriptionPromise;
    if (document.transcription) {
      transcriptionPromise = db
        .collection("organizations")
        .doc(orgID)
        .collection("transcriptions")
        .doc(document.transcription)
        .get()
        .then((doc) => {
          if (doc.exists) {
            return doc.data();
          }
        });
    } else {
      transcriptionPromise = Promise.resolve();
    }

    return transcriptionPromise.then((transcription) =>
      db
        .collection("organizations")
        .doc(orgID)
        .collection("tagGroups")
        .doc(document.tagGroupID)
        .collection("tags")
        .doc(highlight.tagID)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            console.warn(
              `Tag ${highlight.tagID} not found in org ${orgID} -- skipping index`
            );
            return;
          }
          let tag = doc.data();

          let highlightToIndex = {
            // Add an 'objectID' field which Algolia requires
            objectID: highlightRef.id,
            orgID: orgID,
            documentID: highlight.documentID,
            documentName: document.name,
            documentCreationTimestamp: document.creationTimestamp.seconds,
            tagName: tag.name,
            tagColor: tag.color,
            tagTextColor: tag.textColor,
            personID: highlight.personID,
            text: highlight.text,
            tagID: highlight.tagID,
            createdBy: highlight.createdBy,
            creationTimestamp: highlight.creationTimestamp.seconds,
            lastUpdateTimestamp: highlight.lastUpdateTimestamp.seconds,
            source: source,
          };

          let highlightTime = Promise.resolve();

          if (transcription && transcription.inputPath) {
            highlightToIndex.mediaPath = transcription.inputPath;

            highlightTime = documentRef
              .collection("transcriptRevisions")
              .where("timestamp", ">", new admin.firestore.Timestamp(0, 0))
              .orderBy("timestamp", "asc")
              .limit(1)
              .get()
              .then((snapshot) => {
                if (snapshot.empty) {
                  return;
                }
                let revData = snapshot.docs[0].data();
                let revisionID = snapshot.docs[0].id;
                let initialRevision = new Delta(revData.delta.ops);
                let currentRevision = initialRevision;

                // Download timecodes for current transcript.
                const timecodePath = `${orgID}/transcriptions/${document.transcription}/output/timecodes-${revisionID}.json`;
                return getTimecodes(timecodePath).then((timecodes) => {
                  // Construct index interval tree
                  let indexTree = new IntervalTree();
                  timecodes.forEach(([s, e, i, j]) => {
                    indexTree.insert([i, j], [s, e]);
                  });

                  // Compute the document revision at the time of the highlight
                  return documentRef
                    .collection("transcriptDeltas")
                    .where("timestamp", "<", highlight.lastUpdateTimestamp)
                    .orderBy("timestamp", "asc")
                    .get()
                    .then((snapshot) => {
                      snapshot.docs.forEach((deltaDoc) => {
                        let delta = new Delta(deltaDoc.ops);
                        currentRevision = currentRevision.compose(delta);
                      });
                    })
                    .then(() => {
                      let endIndex =
                        highlight.selection.index + highlight.selection.length;

                      let startTime;

                      for (
                        let i = highlight.selection.index;
                        i <= endIndex && startTime === undefined;
                        i++
                      ) {
                        startTime = transcript.indexToTime(
                          i,
                          indexTree,
                          initialRevision,
                          currentRevision
                        );
                      }

                      let endTime = transcript.indexToTime(
                        endIndex,
                        indexTree,
                        initialRevision,
                        currentRevision
                      );

                      return {
                        startTime: startTime,
                        endTime: endTime,
                      };
                    });
                });
              });
          }

          // Attach time codes into highlightToIndex.
          return highlightTime.then((time) => {
            if (time) {
              highlightToIndex.startTime = time.startTime;
              highlightToIndex.endTime = time.endTime;

              if (transcription && transcription.thumbnailToken) {
                // Calculate sequence number from start time.
                const thumbnailInterval = 10;
                const sequence =
                  Math.floor(time.startTime / thumbnailInterval) + 1;

                // Generate URL using token from transcription.
                let bucket = admin.storage().bucket();
                let storagePath = `${orgID}/transcriptions/${transcription.ID}/output/thumbnails/thumb-${sequence}.png`;
                let url = `https://firebasestorage.googleapis.com/v0/b/${
                  bucket.name
                }/o/${encodeURIComponent(storagePath)}?alt=media&token=${
                  transcription.thumbnailToken
                }`;

                // Save URL in index object.
                highlightToIndex.thumbnailURL = url;
              }
            }

            // Write to the algolia index
            return index.saveObject(highlightToIndex).then(
              // Update last indexed timestamp
              highlightRef.ref.set(
                {
                  lastIndexTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
              )
            );
          });
        })
    );
  });
}

exports.onHighlightWritten = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}"
  )
  .onWrite((change, context) => {
    const orgID = context.params.orgID;
    const highlightID = context.params.highlightID;

    return indexHighlight("notes", orgID, highlightID, change.after);
  });

exports.onTranscriptHighlightWritten = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/transcriptHighlights/{highlightID}"
  )
  .onWrite((change, context) => {
    const orgID = context.params.orgID;
    const highlightID = context.params.highlightID;

    return indexHighlight("transcript", orgID, highlightID, change.after);
  });

// Mark highlights with edits more recent than the last indexing operation
// for re-indexing.
exports.markHighlightsForIndexing = functions.pubsub
  .schedule("every 2 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        // Iterate all organizations
        return Promise.all(
          orgsSnapshot.docs.map((orgDoc) => {
            let indexStateRef = orgDoc.ref
              .collection("system")
              .doc("indexState");
            return indexStateRef.get().then((indexStateDoc) => {
              let lastIndexTimestamp = new admin.firestore.Timestamp(0, 0);

              if (indexStateDoc.exists) {
                let cachedTimestamp = indexStateDoc.data().highlightTimestamp;
                if (cachedTimestamp) {
                  lastIndexTimestamp = cachedTimestamp;
                }
              }

              return db
                .collectionGroup("highlights")
                .where("organizationID", "==", orgDoc.id)
                .where("lastUpdateTimestamp", ">", lastIndexTimestamp)
                .get()
                .then((highlightsSnapshot) =>
                  Promise.all(
                    highlightsSnapshot.docs.map((highlightDoc) => {
                      console.debug("indexing highlight", highlightDoc.data());
                      return highlightDoc.ref.set(
                        {
                          indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                        },
                        { merge: true }
                      );
                    })
                  )
                )
                .then(() =>
                  db
                    .collectionGroup("transcriptHighlights")
                    .where("organizationID", "==", orgDoc.id)
                    .where("lastUpdateTimestamp", ">", lastIndexTimestamp)
                    .get()
                    .then((highlightsSnapshot) =>
                      Promise.all(
                        highlightsSnapshot.docs.map((highlightDoc) => {
                          console.debug(
                            "indexing transcript highlight",
                            highlightDoc.data()
                          );
                          return highlightDoc.ref.set(
                            {
                              indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                            },
                            { merge: true }
                          );
                        })
                      )
                    )
                )
                .then(() => {
                  // Update last indexed time
                  return indexStateRef.set(
                    {
                      highlightTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );
                });
            });
          })
        );
      });
  });
