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

function exportInterviewsCollectionGroupWordDoc(
  documentsRef,
  destinationPrefix
) {
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
    documentsRef
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
                const destination = `${destinationPrefix}/${documentID}/notes.docx`;
                console.log(`Uploading ${destination}`);
                return admin.storage().bucket().upload(notesPath, {
                  destination: destination,
                });
              })
              .then(() => {
                return transcriptPromise.then((transcriptText) => {
                  const transcriptPath = tmp.fileSync().name + ".txt";
                  fs.writeFileSync(transcriptPath, transcriptText);
                  const destination = `${destinationPrefix}/${documentID}/transcript.docx`;
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

function exportOrgHighlights(highlightsRef, destinationPrefix, fileName) {
  // Iterate all highlights

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

  return highlightsRef.get().then((highlightsSnapshot) => {
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
      return csvWriter.writeRecords(highlights).then(() => {
        // Upload them to google storage
        return admin
          .storage()
          .bucket()
          .upload(csvPath, {
            destination: `${destinationPrefix}/${fileName}`,
          });
      });
    });
  });
}

function exportPeopleCollectionGroup(peopleRef, destinationPrefix) {
  // Iterate all people in organization
  const customFieldHeaders = {};
  const labelHeaders = {};

  return peopleRef.get().then((peopleSnapshot) => {
    console.log(`exporting ${peopleSnapshot.size} people...`);

    return Promise.all(
      peopleSnapshot.docs.map((personDoc) => {
        let person = personDoc.data();

        // Rewrite timestamps
        person.creationTimestamp =
          person.creationTimestamp &&
          person.creationTimestamp.toDate().toISOString();

        person.deletionTimestamp =
          person.deletionTimestamp &&
          person.deletionTimestamp.toDate().toISOString();

        // Flatten custom fields
        Object.values(person.customFields || {}).forEach((field) => {
          const customFieldKey = `customField-${field.kind}`;
          person[customFieldKey] = field.value;
          customFieldHeaders[customFieldKey] = {
            id: customFieldKey,
            title: customFieldKey.toUpperCase(),
          };
        });

        delete person.customFields;

        // Flatten labels
        Object.values(person.labels || {}).forEach((label) => {
          const labelKey = `label-${label.name}`;
          person[labelKey] = label.name;
          labelHeaders[labelKey] = {
            id: labelKey,
            title: labelKey.toUpperCase(),
          };
        });

        delete person.labels;

        return person;
      })
    ).then((people) => {
      // Write them to a CSV
      let csvPath = tmp.fileSync().name + ".csv";

      const header = [
        { id: "ID", title: "ID" },
        { id: "city", title: "CITY" },
        { id: "company", title: "COMPANY" },
        { id: "country", title: "COUNTRY" },
        { id: "createdBy", title: "CREATED_BY" },
        { id: "creationTimestamp", title: "CREATION_TIMESTAMP" },
        { id: "deletionTimestamp", title: "DELETION_TIMESTAMP" },
        { id: "email", title: "EMAIL" },
        { id: "job", title: "JOB" },
        { id: "name", title: "NAME" },
        { id: "state", title: "STATE" },
      ];

      // append custom column headers
      header.push(...Object.values(customFieldHeaders));
      header.push(...Object.values(labelHeaders));

      const csvWriter = createCsvWriter({
        path: csvPath,
        header: header,
      });

      return csvWriter.writeRecords(people).then(() => {
        // Upload them to google storage
        return admin
          .storage()
          .bucket()
          .upload(csvPath, {
            destination: `${destinationPrefix}/people.csv`,
          });
      });
    });
  });
}

const bucket = functions.config().system.backup_bucket;

function exportOrganization(orgDoc, destinationPrefix) {
  const orgID = orgDoc.id;
  const org = orgDoc.data();

  console.log(`exporting snapshot for org ${org.name}`);

  const db = admin.firestore();

  // TODO: export boards
  // TODO: export snapshots
  // TODO: zip up export files

  const peopleRef = orgDoc.ref.collection("people");

  const highlightsRef = db
    .collectionGroup("highlights")
    .where("organizationID", "==", orgID);

  const transcriptHighlightsRef = db
    .collectionGroup("transcriptHighlights")
    .where("organizationID", "==", orgID);

  return exportPeopleCollectionGroup(peopleRef, destinationPrefix)
    .then(() => {
      return exportOrgHighlights(
        highlightsRef,
        destinationPrefix,
        "highlights.csv"
      );
    })
    .then(() => {
      return exportOrgHighlights(
        transcriptHighlightsRef,
        destinationPrefix,
        "transcriptHighlights.csv"
      );
    })
    .then(() =>
      exportInterviewsCollectionGroupWordDoc(
        orgDoc.ref.collection("documents"),
        destinationPrefix
      )
    );
}

exports.exportOrganizationData = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "2GB",
  })
  .pubsub.topic("exportOrganizationData")
  .onPublish((message) => {
    const db = admin.firestore();
    let timestamp = new Date().toISOString();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgDoc) => {
            const orgID = orgDoc.id;
            const destinationPrefix = `exports/orgs/${orgID}/${timestamp}`;
            return exportOrganization(orgDoc, destinationPrefix);
          })
        );
      });
  });

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
