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
const Delta = require("quill-delta");
const util = require("./util.js");
const { v4: uuidv4 } = require("uuid");

exports.addThemeOrganizationIDs = functions.pubsub
  .topic("theme-org-ids")
  .onPublish((message) => {
    const db = admin.firestore();
    return db
      .collectionGroup("themes")
      .get()
      .then((themesSnapshot) => {
        return Promise.all(
          themesSnapshot.docs.map((themeDoc) => {
            const themeRef = themeDoc.ref;
            const boardRef = themeRef.parent.parent;
            const orgRef = boardRef.parent.parent;
            return themeRef.update({
              organizationID: orgRef.id,
            });
          })
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
                      return doc.ref.update({ thumbnailToken: "" });
                    }
                  })
                )
              )
          )
        );
      });
  });

const reindexAllInSnapshot = (snapshot) => {
  return Promise.all(
    snapshot.docs.map((doc) =>
      doc.ref.update({
        indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
    )
  );
};

exports.reIndexAllHighlights = functions.pubsub
  .topic("reindex-all-highlights")
  .onPublish((message) => {
    // Search for highlights and update the indexRequestedTimestamp.
    const db = admin.firestore();

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

exports.reIndexAllThemes = functions.pubsub
  .topic("reindex-all-themes")
  .onPublish((message) => {
    // Search for themes and update the indexRequestedTimestamp.
    const db = admin.firestore();
    return db.collectionGroup("themes").get().then(reindexAllInSnapshot);
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

exports.repairMembers = functions.pubsub
  .topic("repair-members")
  .onPublish((message) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((snapshot) =>
        Promise.all(
          snapshot.docs.map((orgDoc) =>
            orgDoc.ref
              .collection("members")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((memberDoc) =>
                    memberDoc.ref.update({
                      orgID: orgDoc.id,
                    })
                  )
                )
              )
          )
        )
      );
  });

exports.repairOrgs = functions.pubsub
  .topic("repair-orgs")
  .onPublish((message) => {
    let db = admin.firestore();
    return db
      .collection("organizations")
      .get()
      .then((snapshot) =>
        Promise.all(
          snapshot.docs.map((orgDoc) =>
            orgDoc.ref.update({
              ready: true,
            })
          )
        )
      );
  });

exports.migrateAnalysis = functions.pubsub
  .topic("migrate-analyses")
  .onPublish((message) => {
    let db = admin.firestore();
    return db
      .collection("organizations")
      .get()
      .then((snapshot) =>
        Promise.all(
          snapshot.docs.map((orgDoc) =>
            orgDoc.ref
              .collection("analyses")
              .get()
              .then((snapshot) =>
                Promise.all(
                  snapshot.docs.map((analysisDoc) => {
                    let analysis = analysisDoc.data();
                    let boardRef = orgDoc.ref
                      .collection("boards")
                      .doc(analysisDoc.id);

                    let cardMembership = {};

                    // Create board document.
                    return boardRef.set(analysis).then(() => {
                      // Find card membership and repair.
                      let cardPromise = Promise.resolve();
                      cardPromise = analysisDoc.ref
                        .collection("cards")
                        .get()
                        .then((snapshot) =>
                          Promise.all(
                            snapshot.docs.map((cardDoc) => {
                              let card = cardDoc.data();

                              if (card.groupID) {
                                card.themeID = card.groupID;

                                if (!(card.themeID in cardMembership)) {
                                  cardMembership[card.themeID] = [];
                                }

                                cardMembership[card.themeID].push(cardDoc.id);
                              }

                              if (card.groupColor) {
                                card.themeColor = card.groupColor;
                              }

                              if (!card.documentID) {
                                console.warn(
                                  `Card ${card.id} in analysis ${analysisDoc.id} in org ${orgDoc.id} does not have a document ID: ${card}`
                                );
                                return;
                              }

                              // Try to fetch highlightHitCache document.
                              let highlightRef = orgDoc.ref
                                .collection("documents")
                                .doc(card.documentID)
                                .collection(
                                  card.source === "transcript"
                                    ? "transcriptHighlights"
                                    : "highlights"
                                )
                                .doc(cardDoc.id);
                              let cacheRef = highlightRef
                                .collection("cache")
                                .doc("hit");
                              return cacheRef.get().then((cacheDoc) => {
                                if (cacheDoc.exists) {
                                  card.highlightHitCache = cacheDoc.data();
                                }

                                return boardRef
                                  .collection("cards")
                                  .doc(cardDoc.id)
                                  .set(card);
                              });
                            })
                          )
                        );

                      return cardPromise.then(
                        analysisDoc.ref
                          .collection("groups")
                          .get()
                          .then((snapshot) =>
                            Promise.all(
                              snapshot.docs.map((groupDoc) => {
                                // Migrate groups to themes
                                let theme = groupDoc.data();
                                let themeRef = boardRef
                                  .collection("themes")
                                  .doc(groupDoc.id);

                                theme.creationTimestamp = admin.firestore.FieldValue.serverTimestamp();
                                theme.lastUpdateTimestamp = admin.firestore.FieldValue.serverTimestamp();
                                theme.indexRequestedTimestamp = admin.firestore.FieldValue.serverTimestamp();
                                theme.lastIndexTimestamp = new admin.firestore.Timestamp(
                                  0,
                                  0
                                );

                                return themeRef.set(theme).then(() => {
                                  // Create card ids collection.
                                  if (groupDoc.id in cardMembership) {
                                    let cardIDs = cardMembership[groupDoc.id];
                                    let deleteGroupCardPromise = themeRef
                                      .collection("cardIDs")
                                      .doc(groupDoc.id)
                                      .delete();

                                    return deleteGroupCardPromise.then(() =>
                                      Promise.all(
                                        cardIDs.map((cardID) =>
                                          themeRef
                                            .collection("cardIDs")
                                            .doc(cardID)
                                            .set({ ID: cardID })
                                        )
                                      )
                                    );
                                  }
                                });
                              })
                            )
                          )
                      );
                    });
                  })
                )
              )
          )
        )
      );
  });
