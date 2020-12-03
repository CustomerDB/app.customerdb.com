const functions = require("firebase-functions");
const admin = require("firebase-admin");

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
                      return doc.ref.update({ thumbnailToken: "" });
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
          doc.ref.update({
            indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          })
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

exports.rewriteOauthClaims = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "2GB",
  })
  .pubsub.topic("rewrite-oauth-claims")
  .onPublish((message) => {
    const auth = admin.auth();
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) => {
        console.log(
          `rewriting oauth claims for ${snapshot.size} organizations`
        );
        return Promise.all(
          snapshot.docs.map((doc) => {
            const organization = doc.data();
            organization.id = doc.id;

            const membersRef = doc.ref.collection("members");

            return membersRef.get().then((snapshot) => {
              console.log(
                `rewriting oauth claims for ${snapshot.size} users in organization "${organization.name}"`
              );
              return Promise.all(
                snapshot.docs.map((doc) => {
                  const member = doc.data();

                  console.log(`processing member ${member.email}`);

                  if (!member.active) {
                    console.log(
                      `member ${member.email} is not active -- skipping`
                    );
                    return;
                  }

                  return auth
                    .getUserByEmail(member.email)
                    .then((userRecord) => {
                      const uid = userRecord.uid;
                      const oldClaims = userRecord.customClaims;

                      if (!oldClaims) {
                        console.log(
                          `no custom claims found for ${member.email} (${uid}) -- skipping`
                        );
                        return;
                      }

                      console.log(
                        `found existing custom claims for ${member.email} (${uid})`,
                        oldClaims
                      );

                      const oldOrgs = oldClaims.orgs || {};
                      const newOrgs = Object.assign(oldOrgs, {});
                      newOrgs[organization.id] = {
                        admin: member.admin == true,
                      };
                      const newClaims = Object.assign(oldClaims, {
                        orgs: newOrgs,
                      });
                      console.log(
                        `writing new custom claims for ${member.email} (${uid})`,
                        newClaims
                      );
                      return admin
                        .auth()
                        .setCustomUserClaims(uid, newClaims)
                        .then(() => {
                          // Touch the uid record (`/uids/{uid}`) to trigger id
                          // token refresh in the client.
                          //
                          // NOTE: The client refresh trigger subscription is
                          //       set up and handled in the WithOauthUser component.
                          return db
                            .collection("uids")
                            .doc(uid)
                            .set({
                              refreshTime: admin.firestore.FieldValue.serverTimestamp(),
                            })
                            .then(() => {
                              console.log("done triggering token refresh");
                            });
                        });
                    })
                    .catch((err) => {
                      console.warn("failed to get user", err);
                    });
                })
              );
            });
          })
        );
      });
  });

exports.tagRepair = functions.pubsub
  .schedule("every 4 hours")
  .onRun((context) => {
    let db = admin.firestore();

    // Per organization
    return db
      .collection("organizations")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((orgDoc) => {
            // Go through each tag group
            return orgDoc.ref
              .collection("tagGroups")
              .get()
              .then((snapshot) => {
                return Promise.all(
                  snapshot.docs.map((tagGroupDoc) => {
                    // Go through each tag
                    const tagGroupID = tagGroupDoc.id;
                    return tagGroupDoc.ref
                      .collection("tags")
                      .get()
                      .then((snapshot) => {
                        return Promise.all(
                          snapshot.docs.map((tagDoc) => {
                            // Set tag group id if not already set
                            let tag = tagDoc.data();
                            if (
                              tag.tagGroupID !== tagGroupID ||
                              tag.ID !== tagDoc.id
                            ) {
                              return tagDoc.ref.update({
                                tagGroupID: tagGroupID,
                                ID: tagDoc.id,
                              });
                            }
                          })
                        );
                      });
                  })
                );
              });
          })
        );
      });
  });

// Remove deleted documents from analysis
exports.repairAnalysis = functions.pubsub
  .schedule("every 5 minutes")
  .onRun((context) => {
    const db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) =>
        Promise.all(
          snapshot.docs.map((doc) => {
            let orgID = doc.id;
            let orgRef = db.collection("organizations").doc(orgID);
            let analysesRef = orgRef.collection("analyses");
            let documentsRef = orgRef.collection("documents");

            return analysesRef
              .where("deletionTimestamp", "==", "")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((doc) => {
                    let analysisRef = doc.ref;
                    let analysis = doc.data();

                    if (
                      !analysis.documentIDs ||
                      analysis.documentIDs.length === 0
                    ) {
                      return;
                    }

                    let analysisDocsRef = documentsRef.where(
                      "ID",
                      "in",
                      analysis.documentIDs
                    );

                    return analysisDocsRef.get().then((snapshot) => {
                      let needsUpdate = false;
                      let newDocumentIDs = [];

                      snapshot.docs.forEach((doc) => {
                        let document = doc.data();
                        if (document.deletionTimestamp !== "") {
                          needsUpdate = true;
                          return;
                        }
                        newDocumentIDs.push(doc.id);
                      });

                      if (needsUpdate) {
                        return analysisRef.update({
                          documentIDs: newDocumentIDs,
                        });
                      }
                    });
                  })
                )
              );
          })
        )
      );
  });

exports.highlightRepair = functions.pubsub
  .schedule("every 4 hours")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((orgDoc) => {
            console.log(`Repairing highlights in org ${orgDoc.id}`);
            return orgDoc.ref
              .collection("documents")
              .get()
              .then((snapshot) => {
                return Promise.all(
                  snapshot.docs.map((doc) => {
                    let document = doc.data();
                    let deletionTimestamp = document.deletionTimestamp;

                    return doc.ref
                      .collection("highlights")
                      .get()
                      .then((snapshot) => {
                        return Promise.all(
                          snapshot.docs.map((doc) => {
                            let partialUpdate = {
                              deletionTimestamp: deletionTimestamp,
                            };

                            if (document.personID) {
                              partialUpdate.personID = document.personID;
                            }

                            return doc.ref.update(partialUpdate);
                          })
                        );
                      });
                  })
                );
              });
          })
        );
      });
  });
