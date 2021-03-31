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
const admin = require("firebase-admin");
const firebase_tools = require("firebase-tools");

function garbageCollect(collection) {
  let db = admin.firestore();

  let now = new Date();
  const retentionDays = 30;
  const expiryTime = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  const expiryDate = new Date(expiryTime);

  console.log(`${collection} garbage collection started`);

  return db
    .collectionGroup(collection)
    .where("deletionTimestamp", "<", expiryDate)
    .get()
    .then((snapshot) =>
      Promise.all(
        snapshot.docs.map((doc) => {
          if (!doc.exists) {
            return;
          }

          let ref = doc.ref;
          let path = ref._path.segments.join("/");

          console.warn(
            `Deleting ${path} recursively... deleted at ${doc
              .data()
              .deletionTimestamp.toDate()
              .toISOString()}`
          );

          return firebase_tools.firestore.delete(path, {
            project: process.env.GCLOUD_PROJECT,
            recursive: true,
            yes: true,
            token: functions.config().system.token,
          });
        })
      )
    );
}

exports.people = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("people");
  });

exports.templates = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("templates");
  });

exports.analyses = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("analyses");
  });

exports.boards = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("boards");
  });

exports.tags = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("tags");
  });

exports.tagGroups = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("tagGroups");
  });

exports.documents = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 24 hours")
  .onRun((context) => {
    return garbageCollect("documents");
  });

exports.cursors = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "2GB",
  })
  .pubsub.schedule("every 30 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    let now = new Date();
    const retentionSeconds = 120;
    const expiryTime = now.getTime() - retentionSeconds * 1000;
    const expiryDate = new Date(expiryTime);

    console.log(`cursors garbage collection started`);

    return db
      .collectionGroup("cursors")
      .where("lastUpdateTimestamp", "<", expiryDate)
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((doc) => {
            if (!doc.exists) {
              return;
            }
            let path = doc.ref._path.segments.join("/");
            console.log(`deleting cursor at ${path}`);
            return doc.ref.delete();
          })
        );
      });
  });
