const functions = require("firebase-functions");
const tmp = require("tmp");
const admin = require("firebase-admin");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

exports.avatarImageUpload = functions.pubsub
  .topic("avatar-repair")
  .onPublish((message) => {
    // Search for people with imageData set but no imageURL.
    const db = admin.firestore();
    let bucket = admin.storage().bucket();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) => {
            let orgID = orgRef.id;

            return db
              .collection("organizations")
              .doc(orgID)
              .collection("people")
              .where("deletionTimestamp", "==", "")
              .orderBy("imageData")
              .get()
              .then((peopleSnapshot) => {
                return Promise.all(
                  peopleSnapshot.docs.map((personRef) => {
                    let person = personRef.data();

                    const tmpobj = tmp.fileSync();
                    let img = person.imageData;
                    let data = img.replace(/^data:image\/\w+;base64,/, "");
                    let buf = new Buffer(data, "base64");

                    fs.writeFileSync(tmpobj.name, buf);

                    // Upload file to google storage.
                    let token = uuidv4();
                    let storagePath = `${orgID}/avatars/${personRef.id}/avatar.png`;
                    return bucket
                      .upload(tmpobj.name, {
                        destination: storagePath,
                        metadata: {
                          cacheControl: "max-age=31536000",
                          metadata: {
                            firebaseStorageDownloadTokens: token,
                          },
                        },
                      })
                      .then(() => {
                        // Get URL
                        let url = `https://firebasestorage.googleapis.com/v0/b/${
                          bucket.name
                        }/o/${encodeURIComponent(
                          storagePath
                        )}?alt=media&token=${token}`;

                        // Set URL on person
                        return personRef.ref.set(
                          {
                            imageURL: url,
                          },
                          { merge: true }
                        );
                      });
                  })
                );
              });
          })
        );
      });
  });

exports.avatarImageDataRemove = functions.pubsub
  .topic("avatar-data-remove")
  .onPublish((message) => {
    // Search for people with imageData set but no imageURL.
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) => {
            let orgID = orgRef.id;

            return db
              .collection("organizations")
              .doc(orgID)
              .collection("people")
              .where("deletionTimestamp", "==", "")
              .orderBy("imageData")
              .get()
              .then((peopleSnapshot) => {
                return Promise.all(
                  peopleSnapshot.docs.map((personRef) => {
                    return personRef.ref.set(
                      {
                        imageData: "",
                      },
                      { merge: true }
                    );
                  })
                );
              });
          })
        );
      });
  });

exports.addMissingThumbnailTokens = functions.pubsub
  .topic("add-missing-thumbnail-tokens")
  .onPublish((message) => {
    // Search for transcriptions without thumbnailToken set
    // and set that field to empty string.
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) =>
            db
              .collection("organizations")
              .doc(orgRef.id)
              .collection("transcriptions")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let data = doc.data();
                    if (data.thumbnailToken === undefined) {
                      return doc.ref.set(
                        { thumbnailToken: "" },
                        { merge: true }
                      );
                    }
                  })
                )
              )
          )
        );
      });
  });

exports.addMissingContentType = functions.pubsub
  .topic("add-missing-content-type")
  .onPublish((message) => {
    // Search for transcriptions without contentType set
    // and set that field to video/mp4.
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) =>
            db
              .collection("organizations")
              .doc(orgRef.id)
              .collection("transcriptions")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let data = doc.data();
                    if (data.contentType === undefined) {
                      if (data.inputPath.endsWith("mp4")) {
                        return doc.ref.set(
                          {
                            mediaType: "video",
                            mediaEncoding: "mp4",
                          },
                          { merge: true }
                        );
                      }
                    }
                  })
                )
              )
          )
        );
      });
  });

exports.reThumbnailEverything = functions.pubsub
  .topic("reThumbnailEverything")
  .onPublish((message) => {
    // Search for transcriptions with thumbnailToken set
    // and set that field to empty string.
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        return Promise.all(
          orgsSnapshot.docs.map((orgRef) =>
            db
              .collection("organizations")
              .doc(orgRef.id)
              .collection("transcriptions")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let data = doc.data();
                    if (data.thumbnailToken) {
                      return doc.ref.set(
                        {
                          thumbnailToken: "",
                        },
                        { merge: true }
                      );
                    }
                  })
                )
              )
          )
        );
      });
  });

exports.reIndexAllHighlights = functions.pubsub
  .topic("reindex-all-highlights")
  .onPublish((message) => {
    // Search for highlights and update the indexRequestedTimestamp.
    const db = admin.firestore();

    const reindexAllInSnapshot = (snapshot) => {
      return Promise.all(
        snapshot.docs.map((doc) =>
          doc.ref.set(
            {
              indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          )
        )
      );
    };

    let highlightsPromise = db
      .collectionGroup("highlights")
      .get()
      .then(reindexAllInSnapshot);

    let transcriptHighlightsPromise = db
      .collectionGroup("transcriptHighlights")
      .get()
      .then(reindexAllInSnapshot);

    return Promise.all([highlightsPromise, transcriptHighlightsPromise]);
  });
