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

    return video
      .annotateVideo(request)
      .then(([operation]) => {
        return doc.ref.update({
          status: "pending",
          gcpOperationName: operation.name,
          mediaType: mediaType || "",
          mediaEncoding: mediaEncoding || "",
        });
      })
      .catch((error) => {
        console.debug("transcription failed", doc.id);
        return doc.ref.update({
          status: "failed",
        });
      });
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
                console.debug("checking operation", gcpOperation);
                if (gcpOperation.done) {
                  let result = gcpOperation.result.annotationResults[0].toJSON();
                  if (result.error) {
                    console.warn("transcription operation failed", result);
                    return doc.ref.update({
                      status: "failed",
                    });
                  }

                  let bucket = admin.storage().bucket();

                  const outputPath = `${operation.orgID}/transcriptions/${doc.id}/output/transcript.json`;
                  const tmpobj = tmp.fileSync();

                  fs.writeFileSync(tmpobj.name, JSON.stringify(result));

                  return bucket
                    .upload(tmpobj.name, {
                      destination: outputPath,
                    })
                    .then(() => {
                      return doc.ref.update({
                        status: "finished",
                        outputPath: outputPath,
                      });
                    });
                } else {
                  let progress = gcpOperation.metadata.annotationProgress[0].toJSON();
                  if (progress.progressPercent) {
                    return doc.ref.update({
                      status: "pending",
                      progress: progress.progressPercent,
                    });
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

        return revisionsRef
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
            return change.after.ref.update({
              timecodesPath: timecodesPath,
            });
          })
          .then(() => {
            // Lastly, unlock the document.
            return documentRef.update({
              pending: false,
            });
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
                        return transcriptionRef.update({
                          timecodesPath: timecodesPath,
                        });
                      });
                  }
                );
              });
          })
        );
      });
  });

exports.deleteTranscript = functions.https.onCall((data, context) => {
  // TODO: Use transactions

  // Require authenticated requests
  if (!context.auth || !context.auth.token || !context.auth.token.orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  const orgID = context.auth.token.orgID;
  if (!data.documentID) {
    throw Error("documentID required");
  }
  let documentID = data.documentID;

  let db = admin.firestore();

  let documentRef = db
    .collection("organizations")
    .doc(orgID)
    .collection("documents")
    .doc(documentID);
  return documentRef.get().then((doc) => {
    let document = doc.data();
    let callID = document.callID;

    let callResetPromise = Promise.resolve();

    // Older documents may not have a call associated.
    if (document.callID) {
      let callRef = db
        .collection("organizations")
        .doc(orgID)
        .collection("calls")
        .doc(callID);

      callResetPromise = callRef.update({
        callStartedTimestamp: "",
        callEndedTimestamp: "",
        roomSid: "",
        compositionSid: "",
        compositionRequestedTimestamp: "",
      });
    }

    let transcriptionDeletePromise = Promise.resolve();
    if (document.transcription) {
      let transcriptionRef = db
        .collection("organizations")
        .doc(orgID)
        .collection("transcriptions")
        .doc(document.transcription);
      transcriptionDeletePromise = transcriptionRef.delete();
    }

    // Clear transcript operation, call and delete transcript revisions, deltas and highlights.
    return transcriptionDeletePromise.then(() => {
      return documentRef
        .update({
          transcription: "",
        })
        .then(() => {
          callResetPromise.then(() => {
            // Delete all deltas, revisions and highlights.
            return documentRef
              .collection("transcriptDeltas")
              .get()
              .then((snapshot) => {
                return Promise.all(
                  snapshot.docs.map((doc) => doc.ref.delete())
                );
              })
              .then(() => {
                return documentRef
                  .collection("transcriptRevisions")
                  .get()
                  .then((snapshot) => {
                    return Promise.all(
                      snapshot.docs.map((doc) => doc.ref.delete())
                    );
                  });
              })
              .then(() => {
                return documentRef
                  .collection("transcriptHighlights")
                  .get()
                  .then((snapshot) => {
                    return Promise.all(
                      snapshot.docs.map((doc) => doc.ref.delete())
                    );
                  });
              });
          });
        });
    });
  });
});
