const functions = require("firebase-functions");
const admin = require("firebase-admin");
const tmp = require("tmp");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const util = require("./util.js");

exports.interviewsAndHighlights = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    let timestamp = new Date().toISOString();

    return exportHighlightsCollectionGroup("highlights", timestamp)
      .then(() =>
        exportHighlightsCollectionGroup("transcriptHighlights", timestamp)
      )
      .then(() => exportInterviewsCollectionGroup(timestamp));
  });

function exportInterviewsCollectionGroup(timestamp) {
  // Iterate all interviews
  let db = admin.firestore();

  return db
    .collectionGroup("documents")
    .where("deletionTimestamp", "==", "")
    .get()
    .then((snapshot) => {
      return Promise.all(
        snapshot.docs.map((doc) => {
          const document = doc.data();
          const documentID = doc.id;
          const orgID = doc.ref.parent.parent.id;

          const notesPromise = util
            .revisionAtTime(
              orgID,
              documentID,
              "notes",
              undefined // no ending timestamp; get most current revision
            )
            .then((revision) => {
              console.debug(
                "extracting context from notes revision",
                JSON.stringify(revision)
              );
              return util.deltaToPlaintext(revision);
            });

          const transcriptPromise = util
            .revisionAtTime(
              orgID,
              documentID,
              "transcript",
              undefined // no ending timestamp; get most current revision
            )
            .then((revision) => {
              console.debug(
                "extracting context from transcript revision",
                JSON.stringify(revision)
              );
              return util.deltaToPlaintext(revision);
            });

          return notesPromise
            .then((notesText) => {
              const notesPath = tmp.fileSync().name + ".txt";
              fs.writeFileSync(notesPath, notesText);
              const destination = `exports/${timestamp}/${documentID}/notes.txt`;
              return admin.storage().bucket().upload(notesPath, {
                destination: destination,
              });
            })
            .then(() => {
              return transcriptPromise.then((transcriptText) => {
                const transcriptPath = tmp.fileSync().name + ".txt";
                fs.writeFileSync(transcriptPath, transcriptText);
                const destination = `exports/${timestamp}/${documentID}/transcript.txt`;
                return admin.storage().bucket().upload(transcriptPath, {
                  destination: destination,
                });
              });
            });
        })
      );
    });
}

function exportHighlightsCollectionGroup(collectionGroupName, timestamp) {
  // Iterate all highlights
  let db = admin.firestore();

  let csvPath = tmp.fileSync().name + ".csv";
  const csvWriter = createCsvWriter({
    path: csvPath,
    header: [
      { id: "ID", title: "ID" },
      { id: "createdBy", title: "CREATED_BY" },
      { id: "creationTimestamp", title: "CREATION_TIMESTAMP" },
      { id: "deletionTimestamp", title: "DELETION_TIMESTAMP" },
      { id: "documentID", title: "DOCUMENT_ID" },
      { id: "indexRequestedTimestamp", title: "INDEX_REQUESTED_TIMESTAMP" },
      { id: "lastIndexTimestamp", title: "LAST_INDEX_TIMESTAMP" },
      { id: "lastUpdateTimestamp", title: "LAST_UPDATE_TIMESTAMP" },
      { id: "organizationID", title: "ORGANIZATION_ID" },
      { id: "personID", title: "PERSON_ID" },
      { id: "selectionIndex", title: "SELECTION_INDEX" },
      { id: "selectionLength", title: "SELECTION_LENGTH" },
      { id: "tagID", title: "TAG_ID" },
      { id: "text", title: "TEXT" },
    ],
  });

  return db
    .collectionGroup(collectionGroupName)
    .get()
    .then((highlightsSnapshot) => {
      return Promise.all(
        highlightsSnapshot.docs.map((highlightDoc) => {
          let highlight = highlightDoc.data();

          highlight.selectionIndex = highlight.selection.index;
          highlight.selectionLength = highlight.selection.length;

          // Rewrite timestamps
          highlight.creationTimestamp =
            highlight.creationTimestamp &&
            highlight.creationTimestamp.toDate().toISOString();
          highlight.deletionTimestamp =
            highlight.deletionTimestamp &&
            highlight.deletionTimestamp.toDate().toISOString();
          highlight.indexRequestedTimestamp =
            highlight.indexRequestedTimestamp &&
            highlight.indexRequestedTimestamp.toDate().toISOString();
          highlight.lastIndexTimestamp =
            highlight.lastIndexTimestamp &&
            highlight.lastIndexTimestamp.toDate().toISOString();
          highlight.lastUpdateTimestamp =
            highlight.lastUpdateTimestamp &&
            highlight.lastUpdateTimestamp.toDate().toISOString();

          return highlight;
        })
      ).then((highlights) => {
        // Write them to a CSV
        let destination = `exports/${timestamp}/${collectionGroupName}.csv`;

        return csvWriter.writeRecords(highlights).then(() => {
          // Upload them to google storage
          return admin.storage().bucket().upload(csvPath, {
            destination: destination,
          });
        });
      });
    });
}
