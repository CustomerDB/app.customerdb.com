global.self = {};

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const tmp = require("tmp");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");
const util = require("./util.js");
const firestore = require("@google-cloud/firestore");
const Delta = require("quill-delta");
const zipdir = require("zip-dir");

const { basename } = require("path");

// HACK
const docx = require("docx");
const quillToWord = require("quill-to-word");

const adminClient = new firestore.v1.FirestoreAdminClient();

function writeWordDocument(tagMap, documentName, documentDelta) {
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
        // TODO: Look up speaker name, if assigned in transcription object.
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

  console.log("wordDeltaWithTitle", JSON.stringify(wordDeltaWithTitle));

  return quillToWord.generateWord(wordDeltaWithTitle).then((doc) => {
    return docx.Packer.toBuffer(doc).then((buffer) => {
      return buffer;
    });
  });
}

function writeWordSummary(
  summaryName,
  highlightsRef,
  transcriptHighlightsRef,
  boardsRef,
  documentDelta
) {
  return Promise.all(
    documentDelta.ops.map((op) => {
      let newOp = op;

      if (op.delete || op.retain) {
        return;
      }

      if (op.insert && op.insert["direct-quote"]) {
        let highlightID = op.insert["direct-quote"];

        // highlightID may be in either highlights or transcriptHighlights, so we look
        // up both places.
        return highlightsRef
          .where("ID", "==", highlightID)
          .get()
          .then((snapshot) => {
            if (snapshot.size == 0) {
              return;
            }

            return snapshot.docs[0].data();
          })
          .then((highlight) => {
            if (!highlight) {
              // Try to look up transcript highlight instead.
              return transcriptHighlightsRef
                .where("ID", "==", highlightID)
                .get()
                .then((snapshot) => {
                  if (snapshot.size == 0) {
                    return;
                  }

                  return snapshot.docs[0].data();
                });
            }

            return highlight;
          })
          .then((highlight) => {
            if (!highlight) {
              return;
            }

            return {
              insert: `\nQuote: "${highlight.text}"\n`,
              attributes: { bold: true },
            };
          });
      }

      if (op.insert && op.insert["embed-theme"]) {
        let boardID = op.insert["embed-theme"].boardID;
        let themeID = op.insert["embed-theme"].themeID;

        console.log(`Look up ${boardID} and ${themeID}`);
        return boardsRef
          .doc(boardID)
          .collection("themes")
          .doc(themeID)
          .get()
          .then((doc) => {
            if (!doc.exists) {
              console.log(`Theme ${themeID} does not exist!`);
              return;
            }

            let theme = doc.data();
            let themeName = theme.name;

            console.log(`Found theme ${themeName}`);

            return doc.ref
              .collection("cardIDs")
              .get()
              .then((snapshot) => {
                if (snapshot.size == 0) {
                  return;
                }

                // Look up highlights from cards.
                return Promise.all(
                  snapshot.docs.map((doc) => {
                    let highlightID = doc.id;

                    return highlightsRef
                      .where("ID", "==", highlightID)
                      .get()
                      .then((snapshot) => {
                        if (snapshot.size == 0) {
                          return;
                        }

                        return snapshot.docs[0].data();
                      })
                      .then((highlight) => {
                        if (!highlight) {
                          // Try to look up transcript highlight instead.
                          return transcriptHighlightsRef
                            .where("ID", "==", highlightID)
                            .get()
                            .then((snapshot) => {
                              if (snapshot.size == 0) {
                                return;
                              }

                              return snapshot.docs[0].data();
                            });
                        }
                        return highlight;
                      });
                  })
                ).then((highlights) => {
                  let themeContent = `\nTheme: ${themeName}\n`;

                  highlights.forEach((highlight) => {
                    themeContent += `Quote: ${highlight.text}\n`;
                  });

                  console.log(`Inserting theme: "${themeContent}"`);

                  return {
                    insert: themeContent,
                  };
                });
              });
          });
      }

      return newOp;
    })
  ).then((ops) => {
    let wordDelta = new Delta(ops.flatMap((item) => (item ? [item] : [])));

    let wordDeltaWithTitle = wordDelta.compose(
      new Delta().insert(`${summaryName}\n`, { header: 1 })
    );

    try {
      return quillToWord.generateWord(wordDeltaWithTitle).then((doc) => {
        return docx.Packer.toBuffer(doc).then((buffer) => {
          return buffer;
        });
      });
    } catch (e) {
      console.error(e);
    }
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

                return writeWordDocument(tagMap, document.name, revision);
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
                return writeWordDocument(tagMap, document.name, revision);
              });

            return notesPromise
              .then((notesText) => {
                const notesPath = tmp.fileSync().name + ".txt";
                fs.writeFileSync(notesPath, notesText);
                const destination = `${destinationPrefix}/${documentID}-notes.docx`;
                console.log(`Uploading ${destination}`);
                return admin.storage().bucket().upload(notesPath, {
                  destination: destination,
                });
              })
              .then(() => {
                return transcriptPromise.then((transcriptText) => {
                  const transcriptPath = tmp.fileSync().name + ".txt";
                  fs.writeFileSync(transcriptPath, transcriptText);
                  const destination = `${destinationPrefix}/${documentID}-transcript.docx`;
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

function exportSummaries(summariesRef, destinationPrefix) {
  let db = admin.firestore();

  // Iterate all interviews
  return summariesRef
    .where("deletionTimestamp", "==", "")
    .get()
    .then((snapshot) => {
      return Promise.all(
        snapshot.docs.map((doc) => {
          const summary = doc.data();
          const summaryID = doc.id;
          const orgID = doc.ref.parent.parent.id;

          let revRef = doc.ref.collection("revisions");
          let dRef = doc.ref.collection("deltas");

          const revisionPromise = revRef
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
              const data = snapshot.docs[0].data();
              return {
                delta: new Delta(data.delta.ops),
                timestamp: data.timestamp,
              };
            });

          let summaryPromise = revisionPromise
            .then((revision) => {
              return dRef
                .where("timestamp", ">", revision.timestamp)
                .orderBy("timestamp", "asc")
                .get()
                .then((snapshot) => {
                  // apply uncompacted deltas to revision delta.
                  let result = revision.delta;
                  snapshot.forEach((doc) => {
                    let deltaDoc = doc.data();
                    let delta = new Delta(deltaDoc.ops);
                    result = result.compose(delta);
                  });

                  console.debug(
                    "util.revisionAtTime -- result",
                    JSON.stringify(result)
                  );
                  return result;
                });
            })
            .then((revision) => {
              console.debug(
                "extracting context from notes revision",
                JSON.stringify(revision)
              );

              fs.writeFileSync(`${summaryID}.json`, JSON.stringify(revision));

              let highlightsRef = db
                .collectionGroup("highlights")
                .where("organizationID", "==", orgID)
                .where("deletionTimestamp", "==", "");
              let transcriptHighlightsRef = db
                .collectionGroup("transcriptHighlights")
                .where("organizationID", "==", orgID)
                .where("deletionTimestamp", "==", "");
              let boardsRef = db
                .collection("organizations")
                .doc(orgID)
                .collection("boards");

              return writeWordSummary(
                summary.name,
                highlightsRef,
                transcriptHighlightsRef,
                boardsRef,
                revision
              );
            });

          return summaryPromise.then((summaryText) => {
            const summaryPath = tmp.fileSync().name + ".docx";
            fs.writeFileSync(summaryPath, summaryText);
            console.log(`Wrote ${summaryPath}`);
            const destination = `${destinationPrefix}/summary-${summaryID}.docx`;
            console.log(`Uploading ${destination}`);
            return admin.storage().bucket().upload(summaryPath, {
              destination: destination,
            });
          });
        })
      );
    });
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

function exportThemesFromBoards(themesRef, destinationPrefix) {
  const header = [
    { id: "ID", title: "THEME_ID" },
    { id: "color", title: "COLOR" },
    { id: "creationTimestamp", title: "CREATION_TIMESTAMP" },
    { id: "name", title: "NAME" },
    { id: "textColor", title: "TEXT_COLOR" },
    { id: "text", title: "TEXT" },
    { id: "documentID", title: "DOCUMENT_ID" },
    { id: "documentName", title: "DOCUMENT_NAME" },
    { id: "tagName", title: "TAG_NAME" },
  ];

  // Iterate all themes in organization
  return themesRef.get().then((themesSnapshot) => {
    console.log(`exporting ${themesSnapshot.size} themes...`);

    return Promise.all(
      themesSnapshot.docs.map((themeDoc) => {
        const theme = themeDoc.data();
        const themeRef = themeDoc.ref;
        const cardsRef = themeRef.parent.parent.collection("cards");
        const cardIDsRef = themeRef.collection("cardIDs");

        // Rewrite timestamps
        theme.creationTimestamp =
          theme.creationTimestamp &&
          theme.creationTimestamp.toDate().toISOString();

        return cardIDsRef.get().then((cardIDsSnapshot) => {
          return Promise.all(
            cardIDsSnapshot.docs.map((cardIDDoc) => {
              return cardsRef
                .doc(cardIDDoc.id)
                .get()
                .then((cardDoc) => {
                  if (!cardDoc.exists) return {};

                  const card = cardDoc.data();
                  const entry = Object.assign({}, theme);
                  return Object.assign(entry, {
                    text: card.highlightHitCache && card.highlightHitCache.text,
                    documentID:
                      card.highlightHitCache &&
                      card.highlightHitCache.documentID,
                    documentName:
                      card.highlightHitCache &&
                      card.highlightHitCache.documentName,
                    tagName:
                      card.highlightHitCache && card.highlightHitCache.tagName,
                  });
                });
            })
          );
        });
      })
    ).then((themeEntries) => {
      const flatThemeEntries = themeEntries.flat();

      console.log("flatThemeEntries", flatThemeEntries);

      // Write them to a CSV
      let csvPath = tmp.fileSync().name + ".csv";

      const csvWriter = createCsvWriter({
        path: csvPath,
        header: header,
      });

      return csvWriter.writeRecords(flatThemeEntries).then(() => {
        // Upload them to google storage
        return admin
          .storage()
          .bucket()
          .upload(csvPath, {
            destination: `${destinationPrefix}/themes.csv`,
          });
      });
    });
  });
}

function zipExport(orgRef, destinationPrefix) {
  const tmpDir = tmp.dirSync({ unsafeCleanup: true });
  const tmpZip = tmp.fileSync({ postfix: ".zip" });
  const exportPath = `${destinationPrefix}/CustomerDB-data.zip`;

  const bucket = admin.storage().bucket();

  const query = { prefix: destinationPrefix };
  return bucket.getFiles(query, (err, files) => {
    if (err) throw err;

    // download all files to tmp
    console.log("downloading files for final bundling...");

    return Promise.all(
      files.map((file) => {
        const name = basename(file.name);
        return file.download({ destination: `${tmpDir.name}/${name}` });
      })
    ).then(() => {
      // create zip file
      console.log("creating zip file...");
      return zipdir(tmpDir.name, { saveTo: tmpZip.name }).then(() => {
        // upload zip file
        console.log("uploding zip file...");
        return bucket.upload(
          tmpZip.name,
          { destination: exportPath },
          (err) => {
            if (err) throw err;

            console.log("done uploading zip");
            console.log("updating org dataExportPath in firebase");
            return orgRef.update({ dataExportPath: exportPath }).then(() => {
              console.log("cleaning up tmpfs");
              tmpDir.removeCallback();
              tmpZip.removeCallback();
            });
          }
        );
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

  const peopleRef = orgDoc.ref.collection("people");

  const highlightsRef = db
    .collectionGroup("highlights")
    .where("organizationID", "==", orgID);

  const transcriptHighlightsRef = db
    .collectionGroup("transcriptHighlights")
    .where("organizationID", "==", orgID);

  const documentsRef = orgDoc.ref.collection("documents");

  const themesRef = db
    .collectionGroup("themes")
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
    .then(() => {
      return exportInterviewsCollectionGroupWordDoc(
        documentsRef,
        destinationPrefix
      );
    })
    .then(() => {
      return exportThemesFromBoards(themesRef, destinationPrefix);
    })
    .then(() => {
      return exportSummaries(
        orgDoc.ref.collection("summaries"),
        destinationPrefix
      );
    })
    .then(() => {
      return zipExport(orgDoc.ref, destinationPrefix);
    });
}

exports.exportOrganizationData = functions
  .runWith({
    timeoutSeconds: 540,
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
