global.self = {};

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const tmp = require("tmp");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const util = require("./util.js");
const firestore = require("@google-cloud/firestore");
const Delta = require("quill-delta");

// HACK
const docx = require("docx");
const quillToWord = require("quill-to-word");

const adminClient = new firestore.v1.FirestoreAdminClient();

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

exports.exportFinal = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "2GB",
  })
  .pubsub.topic("exportFinal")
  .onPublish((message) => {
    let timestamp = new Date().toISOString();

    return exportHighlightsCollectionGroup("highlights", timestamp)
      .then(() =>
        exportHighlightsCollectionGroup("transcriptHighlights", timestamp)
      )
      .then(() => exportInterviewsCollectionGroupWordDoc(timestamp));
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

function writeWordDoc(tagMap, documentName, documentDelta) {
  let wordDelta = new Delta(
    documentDelta.ops.flatMap((op) => {
      let newOp = op;

      if (op.delete || op.retain) {
        return [];
      }

      if (op.attributes) {
        let keys = Object.keys(op.attributes);
        if (keys.includes("highlight")) {
          let tag = tagMap[op.attributes["highlight"].tagID];
          if (tag && tag.color) {
            let color = tag.color;
            op.attributes.color = color;
          }

          delete op.attributes["highlight"];
        }
      }

      if (op.insert && op.insert.speaker) {
        // Word to doc doesn't handle empty speaker blots well.
        return [
          {
            insert: `\nSpeaker ${op.insert.speaker.ID}\n`,
            attributes: { bold: true },
          },
        ];
      }

      return [newOp];
    })
  );

  let wordDeltaWithTitle = wordDelta.compose(
    new Delta().insert(`${documentName}\n`, { header: 1 })
  );

  return quillToWord.generateWord(wordDeltaWithTitle).then((doc) => {
    return docx.Packer.toBuffer(doc).then((buffer) => {
      return buffer;
    });
  });
}

function exportInterviewsCollectionGroupWordDoc(timestamp) {
  // Iterate all interviews
  let db = admin.firestore();

  // TODO: Get all tags across all organizations.
  let tagsPromise = db
    .collectionGroup("tags")
    .get()
    .then((snapshot) => {
      tagMap = {};
      snapshot.forEach((doc) => {
        tagMap[doc.id] = doc.data();
      });
      return tagMap;
    });

  return tagsPromise.then((tagMap) =>
    db
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

                return writeWordDoc(tagMap, document.name, revision);
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
                  "extracting context from transcript revision xx",
                  JSON.stringify(revision)
                );
                return writeWordDoc(tagMap, document.name, revision);
              });

            return notesPromise
              .then((notesText) => {
                const notesPath = tmp.fileSync().name + ".txt";
                fs.writeFileSync(notesPath, notesText);
                const destination = `exports/${timestamp}/${documentID}/notes.docx`;
                console.log(`Uploading ${destination}`);
                return admin.storage().bucket().upload(notesPath, {
                  destination: destination,
                });
              })
              .then(() => {
                return transcriptPromise.then((transcriptText) => {
                  const transcriptPath = tmp.fileSync().name + ".txt";
                  fs.writeFileSync(transcriptPath, transcriptText);
                  const destination = `exports/${timestamp}/${documentID}/transcript.docx`;
                  console.log(`Uploading ${destination}`);
                  return admin.storage().bucket().upload(transcriptPath, {
                    destination: destination,
                  });
                });
              });
          })
        );
      })
  );
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
