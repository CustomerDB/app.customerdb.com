const functions = require("firebase-functions");
const admin = require("firebase-admin");
const tmp = require("tmp");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

exports.highlights = functions.pubsub
  .schedule("every 24 hours")
  .onRun((context) => {
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
      .collectionGroup("highlights")
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
          let today = new Date().toISOString();
          let destination = `exports/${today}/highlights.csv`;

          return csvWriter.writeRecords(highlights).then(() => {
            // Upload them to google storage
            return admin.storage().bucket().upload(csvPath, {
              destination: destination,
            });
          });
        });
      });
  });
