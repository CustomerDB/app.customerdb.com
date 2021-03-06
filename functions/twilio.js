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

const functions = require("firebase-functions");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const admin = require("firebase-admin");
const tmp = require("tmp");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const request = require("request");

const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = functions.config().twilio.account_sid;
const twilioApiKeySID = functions.config().twilio.api_key_sid;
const twilioApiKeySecret = functions.config().twilio.api_key_secret;
const Twilio = require("twilio");

const client = new Twilio(twilioApiKeySID, twilioApiKeySecret, {
  accountSid: twilioAccountSid,
});

const E_CALL_ENDED = "CALL_ENDED";
const E_CALL_NOT_STARTED = "CALL_NOT_STARTED";

function getCallForGuest(callID, token) {
  let db = admin.firestore();
  let callRef = db.collectionGroup("calls").where("ID", "==", callID).limit(1);

  return callRef.get().then((snapshot) => {
    if (snapshot.docs.length == 0) {
      throw Error(`Call ${callID} doesn't exist`);
    }

    let call = snapshot.docs[0].data();

    if (call.token !== token) {
      throw Error(`Incorrect token for call ${data.callID}`);
    }

    return call;
  });
}

exports.getGuestAccessToken = functions.https.onCall((data, context) => {
  if (!data.callID) {
    throw Error("callID required");
  }

  if (!data.token) {
    throw Error("token required");
  }

  if (!data.name) {
    throw Error("name required");
  }

  return getCallForGuest(data.callID, data.token).then((call) => {
    if (call.callEndedTimestamp) {
      return { error: E_CALL_ENDED };
    }

    if (!call.callStartedTimestamp) {
      return { error: E_CALL_NOT_STARTED };
    }

    let orgID = call.organizationID;
    let db = admin.firestore();
    let documentRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("documents")
      .doc(call.documentID);
    return documentRef.get().then((documentDoc) => {
      if (!documentDoc.exists) {
        throw Error(`Document ${call.documentID} doesn't exist`);
      }

      let document = documentDoc.data();

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      token.identity = data.name;
      const videoGrant = new VideoGrant({ room: data.callID });
      token.addGrant(videoGrant);

      return {
        accessToken: token.toJwt(),
        callName: document.name,
      };
    });
  });
});

exports.getInterviewAccessToken = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth || !context.auth.token || !context.auth.token.orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  const identity = context.auth.token.email;
  const orgID = context.auth.token.orgID;

  if (!data.callID) {
    throw Error("callID required");
  }

  let db = admin.firestore();
  let callRef = db
    .collectionGroup("calls")
    .where("ID", "==", data.callID)
    .limit(1);

  return callRef.get().then((snapshot) => {
    if (snapshot.docs.length == 0) {
      throw Error(`Call ${data.callID} doesn't exist`);
    }

    let call = snapshot.docs[0].data();

    if (orgID != call.organizationID) {
      throw Error(`Call ${data.callID} is not in the user's organization`);
    }

    // We return the org and document ID so the meet UI has a chance to redirect
    // the user to the document so they can restart the call.
    if (call.callEndedTimestamp) {
      return {
        error: E_CALL_ENDED,
        documentID: call.documentID,
        orgID: orgID,
      };
    }

    let documentRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("documents")
      .doc(call.documentID);
    return documentRef.get().then((documentDoc) => {
      if (!documentDoc.exists) {
        throw Error(`Document ${call.documentID} doesn't exist`);
      }

      let document = documentDoc.data();

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      token.identity = identity;
      const videoGrant = new VideoGrant({ room: data.callID });
      token.addGrant(videoGrant);

      return {
        accessToken: token.toJwt(),
        callName: document.name,
      };
    });
  });
});

exports.getPreflightAccessTokens = functions.https.onCall((data, context) => {
  // Require authenticated requests

  // First case is for guest pre-flight tests.
  // The second case is for logged in users.
  let authorized = Promise.resolve();
  if (data.callID && data.token) {
    authorized = getCallForGuest(data.callID, data.token);
  } else if (
    !context.auth ||
    !context.auth.token ||
    !context.auth.token.orgID
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  return authorized.then(() => {
    if (!data.room || !data.publisherIdentity || !data.subscriberIdentity) {
      throw Error("room, publisherIdentity and subscriberIdentity required");
    }

    let db = admin.firestore();
    let callRef = db
      .collectionGroup("calls")
      .where("ID", "==", data.callID)
      .limit(1);

    return callRef.get().then((snapshot) => {
      if (snapshot.docs.length == 0) {
        throw Error(`Call ${data.callID} doesn't exist`);
      }

      let call = snapshot.docs[0].data();
      if (call.callEndedTimestamp) {
        return { error: E_CALL_ENDED };
      }

      const videoGrant = new VideoGrant({ room: data.room });

      const publisherToken = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      publisherToken.identity = data.publisherIdentity;
      publisherToken.addGrant(videoGrant);

      const subscriberToken = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      subscriberToken.identity = data.subscriberIdentity;
      subscriberToken.addGrant(videoGrant);

      return {
        publisherToken: publisherToken.toJwt(),
        subscriberToken: subscriberToken.toJwt(),
      };
    });
  });
});

exports.startComposition = functions.pubsub
  .schedule("every 2 minutes")
  .onRun(() => {
    let db = admin.firestore();

    let callsRef = db
      .collectionGroup("calls")
      .where("compositionRequestedTimestamp", "==", "")
      .orderBy("roomSid");

    callsRef.get().then((snapshot) => {
      return Promise.all(
        snapshot.docs.map((doc) => {
          let call = doc.data();
          if (!call.roomSid) {
            return;
          }

          return client.video.recordings
            .list({
              groupingSid: [call.roomSid],
            })
            .then((recordings) => {
              if (recordings.length == 0) {
                return;
              }

              let done = true;
              recordings.forEach((r) => {
                if (r.status !== "completed") {
                  done = false;
                  return;
                }
              });

              if (!done) {
                return;
              }

              return client.video.compositions
                .create({
                  roomSid: call.roomSid,
                  audioSources: ["*"],
                  videoLayout: {
                    transcode: {
                      video_sources: ["*"],
                    },
                  },
                  statusCallback: functions.config().twilio
                    .composition_status_callback,
                  format: "mp4",
                })
                .then((result) => {
                  console.log(result);
                  return doc.ref.update({
                    compositionRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  });
                });
            });
        })
      );
    });
  });

exports.roomStatus = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  let status = req.body;

  if (!status.StatusCallbackEvent || !status.RoomSid || !status.RoomName) {
    res.status(400).send("Bad request");
    return;
  }

  const eventFilter = ["room-created", "room-ended"];
  if (!eventFilter.includes(status.StatusCallbackEvent)) {
    console.log(
      `skipping room status event of type ${status.StatusCallbackEvent} for call ${status.RoomName}`
    );
    res.send("OK");
    return;
  }

  if (status.RoomName.startsWith("preflight")) {
    console.log(`skipping room status for preflight room ${status.RoomName}`);
    res.send("OK");
    return;
  }

  let db = admin.firestore();
  let callID = status.RoomName;

  db.collectionGroup("calls")
    .where("ID", "==", callID)
    .limit(1)
    .get()
    .then((snapshot) => {
      if (snapshot.size == 0) {
        res.status(404).send("Call not found");
        return;
      }
      return snapshot.docs[0];
    })
    .then((callDoc) => {
      if (!callDoc) {
        return;
      }

      let call = callDoc.data();

      if (status.StatusCallbackEvent === "room-created") {
        console.log(`updating call ${callDoc.id}: started`);
        return callDoc.ref.update({
          callStartedTimestamp: admin.firestore.Timestamp.fromDate(
            new Date(status.Timestamp)
          ),
          roomSid: status.RoomSid,
          compositionRequestedTimestamp: "",
        });
      }

      if (status.StatusCallbackEvent === "room-ended") {
        console.log(`updating call ${callDoc.id}: ended`);
        return callDoc.ref
          .update({
            callEndedTimestamp: admin.firestore.Timestamp.fromDate(
              new Date(status.Timestamp)
            ),
            roomSid: status.RoomSid,
            compositionRequestedTimestamp: "",
          })
          .then(() => {
            // Mark transcription as in-progress on the document.
            let documentRef = db
              .collection("organizations")
              .doc(call.organizationID)
              .collection("documents")
              .doc(call.documentID);
            return documentRef.update({
              pending: true,
            });
          });
      }
    })
    .then(() => {
      res.send("OK");
    });
});

exports.compositionStatus = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  let status = req.body;

  if (!status.CompositionSid) {
    res.status(400).send("Bad request");
    return;
  }

  console.log("Composition status", status);

  if (status.StatusCallbackEvent !== "composition-available") {
    console.log("Composition event received (but not ready yet)");
    res.send("OK");
    return;
  }

  let db = admin.firestore();
  let callsRef = db
    .collectionGroup("calls")
    .where("roomSid", "==", status.RoomSid)
    .limit(1);

  return callsRef.get().then((snapshot) => {
    if (snapshot.size == 0) {
      res.status(403).send("Call not found");
      return;
    }

    let callRef = snapshot.docs[0].ref;
    return callRef
      .update({
        compositionSid: status.CompositionSid,
      })
      .then(() => {
        res.send("OK");
      });
  });
});

exports.onCompositionReady = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .firestore.document("organizations/{orgID}/calls/{callID}")
  .onUpdate((change, context) => {
    let call = change.after.data();
    if (!call.compositionSid) {
      console.log("Composition not available");
      return;
    }

    const tmpobj = tmp.fileSync();

    const compositionSid = call.compositionSid;
    const uri =
      "https://video.twilio.com/v1/Compositions/" +
      compositionSid +
      "/Media?Ttl=3600";

    return client
      .request({
        method: "GET",
        uri: uri,
      })
      .then(async (response) => {
        let localPath = tmpobj.name + ".mp4";
        console.log("localPath", localPath);
        const file = fs.createWriteStream(localPath);
        console.log("response: ", response);

        // Get participant count from twilio.
        return client.video
          .rooms(call.roomSid)
          .participants.list()
          .then((participants) => {
            return new Promise(function (resolve, reject) {
              const r = request(response.body.redirect_to);
              r.on("response", (res) => {
                res
                  .pipe(file)
                  .on("finish", async () => {
                    console.log(`Video downloaded to ${localPath}`);
                    console.log(
                      `Requesting transcript for ${participants.length} speakers`
                    );

                    let transcriptionID = uuidv4();

                    let outputPath = `${call.organizationID}/transcriptions/${transcriptionID}/input/out.mp4`;

                    let db = admin.firestore();
                    let transcriptionRef = db
                      .collection("organizations")
                      .doc(call.organizationID)
                      .collection("transcriptions")
                      .doc(transcriptionID);
                    return transcriptionRef
                      .set({
                        ID: transcriptionID,
                        speakers: participants.length,
                        createdBy: call.createdBy,
                        creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                        deletionTimestamp: "",
                        inputPath: outputPath,
                        thumbnailToken: "",
                        orgID: call.organizationID,
                        documentID: call.documentID,
                      })
                      .then(() => {
                        let documentRef = db
                          .collection("organizations")
                          .doc(call.organizationID)
                          .collection("documents")
                          .doc(call.documentID);
                        return documentRef.update({
                          pending: true,
                          transcription: transcriptionID,
                        });
                      })
                      .then(() =>
                        admin
                          .storage()
                          .bucket()
                          .upload(localPath, {
                            destination: outputPath,
                            resumable: false,
                          })
                          .then(() => {
                            resolve();
                          })
                      );
                  })
                  .on("error", (error) => {
                    reject(error);
                  });
              });
            });
          });
      })
      .catch((error) => {
        console.log("Error fetching /Media resource " + error);
      });
  });
