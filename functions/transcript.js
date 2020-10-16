const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Video = require("@google-cloud/video-intelligence").v1p3beta1;
const tmp = require("tmp");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const Delta = require("quill-delta");

exports.start = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket;
  const filePath = object.name;
  const contentType = object.contentType;

  const [mediaType, mediaEncoding] = contentType.split("/", 2);

  if (!(contentType.startsWith("video/") || contentType.startsWith("audio/"))) {
    console.log(
      "object content type is not video or audio -- skipping",
      contentType
    );
    return;
  }

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
        mediaType: mediaType || "",
        mediaEncoding: mediaEncoding || "",
      },
      { merge: true }
    );
  });
});

// Check every minute for videos in progress
// We have to do this on a schedule as a transcription may take a long time to process.
exports.progress = functions.pubsub
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

      let newRevision = new Delta([{ insert: "\n" }]);
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
          if (speakerTag !== lastSpeaker) {
            let ops = [];

            if (deltaOffset > 0) {
              ops.push({ retain: deltaOffset });
            }

            ops.push({ insert: { speaker: { ID: speakerTag } } });

            newRevision = newRevision.compose(new Delta(ops));

            deltaOffset++; // embed blots are of length 1

            lastSpeaker = speakerTag;
          }

          let transcriptWord = word.word + " ";
          newRevision = newRevision.compose(
            new Delta([{ retain: deltaOffset }, { insert: transcriptWord }])
          );

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
        revision: newRevision,
        timecodes: timecodes,
      };
    });
};

// Create delta for completed transcription
exports.deltaForTranscript = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "1GB",
  })
  .firestore.document("organizations/{orgID}/transcriptions/{transcriptionID}")
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

exports.repair = functions.pubsub
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
exports.migrate = functions
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
