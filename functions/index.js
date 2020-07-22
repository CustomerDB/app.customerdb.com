const sgMail = require("@sendgrid/mail");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const csv = require("csv-parser");
const algoliasearch = require("algoliasearch");

admin.initializeApp();

const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
const ALGOLIA_SEARCH_KEY = functions.config().algolia.search_key;
const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);

exports.getSearchKey = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  let orgID = context.auth.token.orgID;
  if (!orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "user organization not found"
    );
  }

  // Create the params object as described in the Algolia documentation:
  // https://www.algolia.com/doc/guides/security/api-keys/#generating-api-keys
  const params = {
    // This filter ensures that only items where orgID == user's org ID are readable
    filters: `orgID:${orgID}`,
    // We also proxy the token uid as a unique token for this key.
    userToken: context.auth.uid,
  };

  // Call the Algolia API to generate a unique key based on our search key
  const key = client.generateSecuredApiKey(ALGOLIA_SEARCH_KEY, params);

  // Store it in the user's api key document.
  let db = admin.firestore();
  let apiKeyRef = db.collection("organizations").doc(orgID).collection("apiKeys").doc(context.auth.uid);
  
  return apiKeyRef.set({
    'searchKey': key
  })
  .then(() => {return {key: key}})
})

// Authentication trigger adds custom claims to the user's auth token
// when members are written
exports.onMemberWritten = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    console.log("handling update (params):", context.params);

    let before = change.before.data();
    let after = change.after.data();

    let uid = before.uid || after.uid;

    if (!uid) {
      console.log("no uid -- terminating");
      return;
    }

    // Remove custom claims if necessary.
    // TODO(CD): only delete claims for this orgID.

    let memberRecordDeleted = !change.after.exists;
    if (memberRecordDeleted) {
      console.log(`member record deleted -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    let memberInactive = !after.active;
    if (memberInactive) {
      console.log(`member is inactive -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    // Add custom claims if necessary.
    // TODO(CD): Make this work for multiple orgs

    let newCustomClaims = {
      orgID: context.params.orgID,
      admin: after.admin,
    };

    console.log(`getting user record ${uid} to read custom claims`);
    return admin
      .auth()
      .getUser(uid)
      .then((userRecord) => {
        let oldClaims = userRecord.customClaims;

        console.log(`found existing custom claims for ${uid}`, oldClaims);

        let missingClaims =
          !oldClaims || !("orgID" in oldClaims) || !("admin" in oldClaims);

        // True if the user is an active org member (should have claims)
        // but does not have claims for any reason.
        let needsClaims = after.active && missingClaims;

        // True if a user is writing their own member uid (join org operation)
        let memberJoined = !before.uid && before.uid !== after.uid;

        // True if the member admin bit changed
        let adminChanged = before.admin !== after.admin;

        if (needsClaims || memberJoined || adminChanged) {
          console.log("writing new custom claims", newCustomClaims);

          // Set custom claims for the user.
          return admin
            .auth()
            .setCustomUserClaims(uid, newCustomClaims)
            .then(() => {
              console.log(`triggering token refresh for /uids/${uid}`);
              // Touch the uid record (`/uids/{uid}`) to trigger id
              // token refresh in the client.
              //
              // NOTE: The client refresh trigger subscription is
              //       set up and handled in the WithOauthUser component.
              return admin
                .firestore()
                .collection("uids")
                .doc(uid)
                .set({
                  refreshTime: admin.firestore.FieldValue.serverTimestamp(),
                })
                .then(() => {
                  console.log("done triggering token refresh");
                });
            });
        }
      });
  });

exports.emailInviteJob = functions.pubsub
  .schedule("every 5 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    db.collection("organizations")
      .get()
      .then((snapshot) => {
        let organizationPromises = [];
        console.log("Snapshot size", snapshot.size);
        snapshot.forEach((doc) => {
          let orgID = doc.id;

          organizationPromises.push(
            new Promise((accept, reject) => {
              let memberPromises = [];

              // list member collections to get.
              memberPromises.push(
                db
                  .collection("organizations")
                  .doc(orgID)
                  .collection("members")
                  .where("invited", "==", true)
                  .where("active", "==", false)
                  .where("inviteSentTimestamp", "==", "")
                  .get()
                  .then((snapshot) => {
                    let mailPromises = [];

                    snapshot.forEach((doc) => {
                      mailPromises.push(
                        new Promise((accept, reject) => {
                          let member = doc.data();

                          console.log("Sending email to ", member);

                          let mailHtml = fs.readFileSync(
                            "mail_templates/invite_mail.html",
                            "utf8"
                          );
                          let mailTxt = fs.readFileSync(
                            "mail_templates/invite_mail.txt",
                            "utf8"
                          );

                          mailHtml = mailHtml.replace("{{orgID}}", orgID);
                          mailTxt = mailTxt.replace("{{orgID}}", orgID);

                          sgMail.setApiKey(functions.config().sendgrid.api_key);
                          const msg = {
                            to: member.email,
                            from: "noreply@quantap.com",
                            subject:
                              "You have been invited to join a team on CustomerDB",
                            text: mailTxt,
                            html: mailHtml,
                          };
                          sgMail.send(msg);

                          doc.ref
                            .set(
                              {
                                inviteSentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                              },
                              { merge: true }
                            )
                            .then(() => {
                              // accept
                              accept();
                            })
                            .catch((e) => {
                              reject(e);
                            });
                        })
                      );
                    });

                    console.log(
                      "Waiting for ",
                      mailPromises.length,
                      " mail promises"
                    );
                    return Promise.all(mailPromises)
                      .then(() => accept())
                      .catch((e) => {
                        reject(e);
                      });
                  })
              );

              console.log(
                "Waiting for ",
                memberPromises.length,
                " member promises"
              );
              return Promise.all(memberPromises)
                .then(() => accept())
                .catch((e) => {
                  reject(e);
                });
            })
          );
        });

        console.log(
          "Waiting for ",
          organizationPromises.length,
          " organization promises"
        );
        return Promise.all(organizationPromises);
      })
      .then(() => {
        console.log("Job finished");
      })
      .catch((e) => {
        console.log(e);
      });
  });

exports.parseCSV = function (db, dataset, tempFilePath) {
  let highlights = dataset.collection("highlights");

  // Read the CSV.
  let batch = db.batch();
  let batchSize = 250; // batched writes can contain up to 500 operations
  let batchPromises = [];
  let count = 0;
  let batchNum = 1;
  let tags = {};

  return new Promise(function (resolve, reject) {
    console.log("Read csv ", tempFilePath);

    fs.createReadStream(tempFilePath)
      .pipe(csv())
      .on("data", function (row) {
        // Build a list of tags.
        // TODO: Make a required list of properties.
        if (!row.hasOwnProperty("Tag")) {
          console.error(new Error("Row missing 'Tag' field"));
          return;
        }

        // Empthy columns are not allowed in firestore.
        if (row.hasOwnProperty("")) {
          delete row[""];
        }

        let highlightRef = highlights.doc();
        batch.set(highlightRef, row);
        count++;

        let tag = row["Tag"];
        if (!tags.hasOwnProperty(tag)) {
          tags[tag] = 0;
        }
        tags[tag]++;

        if (count == batchSize) {
          console.log(`Batch commit ${batchNum}`);
          batchPromises.push(batch.commit());
          batch = db.batch();
          count = 0;
          batchNum++;
        }
      })
      .on("end", () => {
        batchPromises.push(batch.commit());
        resolve(Promise.all(batchPromises));
      });
  }).then(function () {
    console.log("Recording processed timestamp");
    let now = new Date();
    return dataset.set(
      {
        tags: Object.keys(tags),
        processedAt: now.toISOString(),
      },
      { merge: true }
    );
  });
};

exports.processCSVUpload = functions.storage.object().onFinalize((object) => {
  let db = admin.firestore();

  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.

  console.log("fileBucket: " + fileBucket);

  // Get the file name.
  const datasetID = path.basename(filePath);

  console.log(`Processing dataset ${datasetID}`);

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), datasetID);

  let dataset = db.collection("datasets").doc(datasetID);

  let download = bucket.file(filePath).download({ destination: tempFilePath });
  return download
    .then(() => {
      return exports.parseCSV(db, dataset, tempFilePath);
    })
    .then(function () {
      console.log("Deleting temporary file");
      return fs.unlinkSync(tempFilePath);
    });
});

exports.deleteDataset = functions.firestore
  .document("datasets/{datasetID}")
  .onUpdate((snap, context) => {
    let storage = admin.storage();
    let bucket = storage.bucket();
    let data = snap.after.data();

    if (
      data.hasOwnProperty("deletedAt") &&
      data.hasOwnProperty("googleStoragePath")
    ) {
      console.log("Deleting: " + data);
      return bucket
        .file(data.googleStoragePath)
        .delete()
        .then(function () {
          return snap.after.ref.delete();
        });
    }
  });
