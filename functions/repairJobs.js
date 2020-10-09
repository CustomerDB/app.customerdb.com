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

// TODO(NN): After imageURL is available and front-end change deployed,
//           deploy job to remove imageData field.
