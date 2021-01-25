const admin = require("firebase-admin");
const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");

const ALGOLIA_ID = functions.config().algolia
  ? functions.config().algolia.app_id
  : undefined;
const ALGOLIA_ADMIN_KEY = functions.config().algolia
  ? functions.config().algolia.api_key
  : undefined;
const ALGOLIA_THEMES_INDEX_NAME = functions.config().algolia
  ? functions.config().algolia.themes_index
  : undefined;

let client;
if (ALGOLIA_ID && ALGOLIA_ADMIN_KEY) {
  client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);
}

function newCard(ID, tagID, documentID, cache, source) {
  const CANVAS_WIDTH = 12000;
  const CANVAS_HEIGHT = 8000;
  const VIEWPORT_WIDTH = 1500;
  const VIEWPORT_HEIGHT = 800;
  const pxPerRem = 16;
  const cardWidthRems = 16;
  const cardHeightRems = 9;
  const cardWidthPx = cardWidthRems * pxPerRem;
  const cardHeightPx = cardHeightRems * pxPerRem;

  // Pick random location around middle of canvas.
  let minX =
    CANVAS_WIDTH / 2 -
    VIEWPORT_WIDTH / 2 +
    Math.floor(Math.random() * VIEWPORT_WIDTH);
  let maxX = minX + cardWidthPx;
  let minY =
    CANVAS_HEIGHT / 2 -
    VIEWPORT_HEIGHT / 2 +
    Math.floor(Math.random() * VIEWPORT_HEIGHT);
  let maxY = minY + cardHeightPx;

  let card = {
    ID: ID,
    minX: minX,
    minY: minY,
    maxX: maxX,
    maxY: maxY,
    kind: "card",
    tagID: tagID,
    documentID: documentID,
    themeColor: "#000",
    textColor: "#FFF",
    source: source,
  };

  if (cache) {
    card.highlightHitCache = cache;
  }

  return card;
}

function deleteCardsForDocument(cardsRef, documentID) {
  return cardsRef
    .where("documentID", "==", documentID)
    .get()
    .then((snapshot) =>
      Promise.all(
        snapshot.docs.map((doc) => {
          console.debug("Deleting card for highlight", doc.id);

          return doc.ref.delete();
        })
      )
    );
}

// Remove cards from board
exports.cardsInBoard = functions.firestore
  .document("organizations/{orgID}/boards/{boardID}")
  .onUpdate((change, context) => {
    let before = change.before.data();
    let after = change.after.data();
    const { orgID, boardID } = context.params;

    const db = admin.firestore();

    const boardRenamed = before.name !== after.name;

    // Reindex themes of this board if the board was renamed
    let themeReindexPromise = Promise.resolve();
    if (boardRenamed) {
      console.debug(
        `Reindexing themes for board "${after.name}" with ID ${boardID}`
      );
      const themesRef = change.after.ref.collection("themes");
      themeReindexPromise = themesRef.get().then((snapshot) => {
        return Promise.all(
          snapshot.docs.map((doc) => {
            return doc.ref.update({
              lastUpdateTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          })
        );
      });
    }

    let boardRef = change.after.ref;
    let cardsRef = boardRef.collection("cards");

    // Remove cards if document is no longer present.
    let cardCleanupPromise = Promise.resolve();
    if (before.documentIDs && before.documentIDs.length > 0) {
      let afterDocumentIDs = after.documentIDs || [];
      console.debug(`Removing cards for documents ${before.documentIDs}`);
      cardCleanupPromise = Promise.all(
        before.documentIDs.map((documentID) => {
          if (!afterDocumentIDs.includes(documentID)) {
            return deleteCardsForDocument(cardsRef, documentID);
          }
        })
      );
    }

    const createCardsFromHighlight = (snapshot, source) => {
      return Promise.all(
        snapshot.docs.map((highlightDoc) => {
          let data = highlightDoc.data();
          // Each highlight should have a card
          let cardRef = cardsRef.doc(highlightDoc.id);

          let cacheRef = highlightDoc.ref.collection("cache").doc("hit");
          return cacheRef.get().then((cacheDoc) => {
            console.debug("Creating card for highlight", cacheDoc.id);

            let cache = undefined;
            if (cacheDoc.exists) {
              cache = cacheDoc.data();
            }

            return cardRef.get().then((cardDoc) => {
              if (!cardDoc.exists) {
                return cardRef.set(
                  newCard(
                    highlightDoc.id,
                    data.tagID,
                    data.documentID,
                    cache,
                    source
                  )
                );
              }
            });
          });
        })
      );
    };

    let cardCreationPromise;
    if (after.documentIDs && after.documentIDs.length > 0) {
      let beforeDocumentIDs = before.documentIDs || [];

      cardCreationPromise = Promise.all(
        after.documentIDs.map((documentID) => {
          let newDocuments = [];
          if (!beforeDocumentIDs.includes(documentID)) {
            newDocuments.push(documentID);
          }

          if (newDocuments.length == 0) {
            return;
          }

          console.debug(`Adding cards for documents ${newDocuments}`);

          let allHighlightsRef = db.collectionGroup("highlights");
          let allTranscriptHighlightsRef = db.collectionGroup(
            "transcriptHighlights"
          );

          return Promise.all(
            newDocuments.map((documentID) =>
              Promise.all([
                allHighlightsRef
                  .where("organizationID", "==", orgID)
                  .where("documentID", "==", documentID)
                  .get()
                  .then((snapshot) => {
                    return createCardsFromHighlight(snapshot, "notes");
                  }),
                allTranscriptHighlightsRef
                  .where("organizationID", "==", orgID)
                  .where("documentID", "==", documentID)
                  .get()
                  .then((snapshot) =>
                    createCardsFromHighlight(snapshot, "transcript")
                  ),
              ])
            )
          );
        })
      );
    }

    return Promise.all([
      cardCleanupPromise,
      cardCreationPromise,
      themeReindexPromise,
    ]);
  });

function highlightCreate(highlightDoc, context, source) {
  const db = admin.firestore();
  const orgID = context.params.orgID;
  const documentID = context.params.documentID;
  const highlightID = context.params.highlightID;

  // A new highlight may need to be added (in a card) to boards which subscribes to this document.
  // Find boards subscribing to this document.

  // TODO: Make documentIDs a collection group, so we don't have to traverse the boards.
  return db
    .collection("organizations")
    .doc(orgID)
    .collection("boards")
    .get()
    .then((snapshot) =>
      snapshot.docs.map((doc) => {
        let board = doc.data();
        let cardsRef = doc.ref.collection("cards");

        if (board.documentIDs && board.documentIDs.includes(documentID)) {
          let cardRef = cardsRef.doc(highlightID);

          console.debug(`Adding highlight ${highlightID} to board ${doc.id}`);
          let data = highlightDoc.data();
          return cardRef.set(
            newCard(highlightID, data.tagID, data.documentID, undefined, source)
          );
        }
      })
    );
}

function highlightDelete(doc, context, source) {
  const db = admin.firestore();
  const orgID = context.params.orgID;
  const documentID = context.params.documentID;
  const highlightID = context.params.highlightID;

  // Remove card from boards which subscribes to this document.
  return db
    .collection("organizations")
    .doc(orgID)
    .collection("boards")
    .get()
    .then((snapshot) =>
      snapshot.docs.map((doc) => {
        let board = doc.data();
        let cardsRef = doc.ref.collection("cards");

        if (board.documentIDs && board.documentIDs.includes(documentID)) {
          console.debug(
            `Removing highlight ${highlightID} from board ${doc.id}`
          );

          return cardsRef.doc(highlightID).delete();
        }
      })
    );
}

exports.noteHighlightCreate = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}"
  )
  .onCreate((doc, context) => {
    return highlightCreate(doc, context, "notes");
  });

exports.transcriptHighlightCreate = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/transcriptHighlights/{highlightID}"
  )
  .onCreate((doc, context) => {
    return highlightCreate(doc, context, "transcript");
  });

exports.noteHighlightDelete = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}"
  )
  .onDelete((doc, context) => {
    return highlightDelete(doc, context, "notes");
  });

exports.transcriptHighlightDelete = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/transcriptHighlights/{highlightID}"
  )
  .onDelete((doc, context) => {
    return highlightDelete(doc, context, "transcript");
  });

// TODO: see if we can use a collection theme query to look up all
//       cards for the highlight in question, the update them directly
//       without iterating boards.
function highlightCacheUpdates(change, context, source) {
  // Store the cache object in cards with that ID. Or clear if removed.
  const db = admin.firestore();
  const orgID = context.params.orgID;
  const documentID = context.params.documentID;
  const highlightID = context.params.highlightID;

  return db
    .collection("organizations")
    .doc(orgID)
    .collection("boards")
    .get()
    .then((snapshot) =>
      snapshot.docs.map((doc) => {
        let boardRef = doc.ref;
        let board = doc.data();
        if (board.documentIDs && board.documentIDs.includes(documentID)) {
          return boardRef
            .collection("cards")
            .doc(highlightID)
            .get()
            .then((doc) => {
              let card;
              if (!doc.exists && change.after.exists) {
                let cache = change.after.data();
                card = newCard(
                  highlightID,
                  cache.tagID,
                  cache.documentID,
                  cache,
                  source
                );
                card.highlightHitCache = cache;
              }

              if (doc.exists && change.after.exists) {
                card = doc.data();
                let cache = change.after.data();
                card.highlightHitCache = cache;
              }

              if (doc.exists && !change.after.exists) {
                card = doc.data();
                delete card["highlightHitCache"];
              }

              if (!card) {
                return;
              }

              return boardRef.collection("cards").doc(highlightID).set(card);
            });
        }
      })
    );
}

exports.noteHighlightCacheUpdates = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}/cache/{cacheID}"
  )
  .onWrite((change, context) => {
    return highlightCacheUpdates(change, context, "notes");
  });

exports.transcriptHighlightCacheUpdates = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/transcriptHighlights/{highlightID}/cache/{cacheID}"
  )
  .onWrite((change, context) => {
    return highlightCacheUpdates(change, context, "transcript");
  });

function deletethemeForSingleCard(themeRef, cardsRef) {
  return themeRef
    .collection("cardIDs")
    .get()
    .then((snapshot) => {
      if (snapshot.size < 2) {
        // Unset theme information in the card.
        let cardPromise = Promise.resolve();
        if (snapshot.size === 1) {
          let cardID = snapshot.docs[0].id;
          cardPromise = cardsRef.doc(cardID).update({
            themeID: "",
          });
        }

        return cardPromise.then(() =>
          Promise.all(snapshot.docs.map((doc) => doc.ref.delete())).then(() =>
            themeRef.delete()
          )
        );
      }
    });
}

exports.cardUpdates = functions.firestore
  .document("organizations/{orgID}/boards/{boardID}/cards/{cardID}")
  .onWrite((change, context) => {
    const db = admin.firestore();
    const { orgID, boardID, cardID } = context.params;

    const boardRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("boards")
      .doc(boardID);
    const themesRef = boardRef.collection("themes");
    const cardsRef = boardRef.collection("cards");

    // Make sure card contains a cached highlight hit.
    let hitPromise = Promise.resolve();
    if (change.after.exists) {
      let after = change.after.data();
      if (!after.highlightHitCache) {
        let cacheRef = db
          .collection("organizations")
          .doc(orgID)
          .collection("documents")
          .doc(after.documentID)
          .collection(
            after.source === "notes" ? "highlights" : "transcriptionHighlights"
          )
          .doc(cardID)
          .collection("cache")
          .doc("hit");
        hitPromise = cacheRef.get().then((doc) => {
          if (!doc.exists) {
            console.log(
              `Could not update hit for card ${cardID}: cache hit not found`
            );
            return;
          }
          let hit = doc.data();
          console.log(
            `Updating card ${cardID} with hit ${JSON.stringify(hit)}`
          );
          change.after.ref.update({
            highlightHitCache: hit,
          });
        });
      }
    }

    // Update theme membership.
    let updatePromise = Promise.resolve();
    let membershipChanged = false;

    // See whether theme changed for the card.
    if (change.before.exists && change.after.exists) {
      let before = change.before.data();
      let after = change.after.data();

      if (before.themeID !== after.themeID) {
        membershipChanged = true;

        if (after.themeID) {
          let themeRef = themesRef.doc(after.themeID);
          updatePromise = themeRef.collection("cardIDs").doc(after.ID).set({
            ID: after.ID,
          });
        }
      }
    }

    let themeCleanupPromise = updatePromise.then(() => {
      // If a card has changed themes or just deleted, verify the source theme for any existing cards. If only one, delete.
      if (change.before.exists && (membershipChanged || !change.after.exists)) {
        // Remove from theme.
        let before = change.before.data();
        if (before.themeID) {
          let themeRef = themesRef.doc(before.themeID);
          return themeRef
            .collection("cardIDs")
            .doc(before.ID)
            .delete()
            .then(() => deletethemeForSingleCard(themeRef, cardsRef));
        }
      }
    });

    return Promise.all([hitPromise, themeCleanupPromise]);
    // TODO: In some cases, a theme is broken by a card move. Detect this by recalculating intersections.
  });

exports.documentUpdates = functions.firestore
  .document("organizations/{orgID}/documents/{documentID}")
  .onUpdate((change, context) => {
    const db = admin.firestore();
    let before = change.before.data();
    let after = change.after.data();
    const { orgID, documentID } = context.params;

    if (before.deletionTimestamp === "" && after.deletionTimestamp !== "") {
      // If document has been marked for deletion, remove documentID from boards.
      return db
        .collection("organizations")
        .doc(orgID)
        .collection("boards")
        .get()
        .then((snapshot) =>
          Promise.all(
            snapshot.docs.map((doc) => {
              let board = doc.data();

              if (board.documentIDs && board.documentIDs.includes(documentID)) {
                console.log(`Should remove ${documentID} to board ${doc.id}`);
                return doc.ref.update({
                  documentIDs: board.documentIDs.filter(
                    (item) => item !== documentID
                  ),
                });
              }
            })
          )
        );
    }
  });

exports.indexUpdatedTheme = functions.firestore
  .document("organizations/{orgID}/boards/{boardID}/themes/{themeID}")
  .onWrite((change, context) => {
    const { orgID, boardID, themeID } = context.params;
    const index = client.initIndex(ALGOLIA_THEMES_INDEX_NAME);

    if (!change.after.exists) {
      // Delete theme from index
      return index.deleteObject(themeID);
    }

    const theme = change.after.data();
    const themeRef = change.after.ref;

    console.debug("indexUpdatedTheme", JSON.stringify(theme));

    if (
      theme.lastIndexTimestamp &&
      theme.indexRequestedTimestamp &&
      theme.lastIndexTimestamp.toDate().valueOf() >
        theme.indexRequestedTimestamp.toDate().valueOf()
    ) {
      console.log(
        `skipping indexing theme ${themeID} as it was indexed after index requested`
      );
      return Promise.resolve();
    }

    return themeRef
      .collection("cardIDs")
      .get()
      .then((snapshot) => {
        const cardIDs = snapshot.docs.map((doc) => doc.id);
        const boardRef = themeRef.parent.parent;

        return boardRef.get().then((doc) => {
          // Compute record to send to the search index service
          const board = doc.exists ? doc.data() : {};
          const boardName = board.name || "";

          const themeToIndex = {
            objectID: themeID,
            orgID: orgID,
            boardID: boardID,
            boardName: boardName,
            name: theme.name,
            description: theme.description || "",
            cardIDs: cardIDs,
            creationTimestamp:
              theme.creationTimestamp && theme.creationTimestamp.seconds,
          };

          return index.saveObject(themeToIndex).then(() => {
            return themeRef.update({
              lastIndexTimestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          });
        });
      });
  });

// Mark themes with edits more recent than the last indexing operation
// for re-indexing.
exports.markThemesForIndexing = functions.pubsub
  .schedule("every 1 minutes")
  .onRun((context) => {
    let db = admin.firestore();

    return db
      .collection("organizations")
      .get()
      .then((orgsSnapshot) => {
        // Iterate all organizations
        return Promise.all(
          orgsSnapshot.docs.map((orgDoc) => {
            let indexStateRef = orgDoc.ref
              .collection("system")
              .doc("indexState");
            return indexStateRef.get().then((indexStateDoc) => {
              let lastIndexTimestamp = new admin.firestore.Timestamp(0, 0);

              if (indexStateDoc.exists) {
                let cachedTimestamp = indexStateDoc.data().themeTimestamp;
                if (cachedTimestamp) {
                  lastIndexTimestamp = cachedTimestamp;
                }
              }

              return db
                .collectionGroup("themes")
                .where("organizationID", "==", orgDoc.id)
                .where("lastUpdateTimestamp", ">", lastIndexTimestamp)
                .get()
                .then((themesSnapshot) =>
                  Promise.all(
                    themesSnapshot.docs.map((themeDoc) => {
                      console.debug("indexing theme", themeDoc.data());
                      return themeDoc.ref.update({
                        indexRequestedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                      });
                    })
                  )
                )
                .then(() => {
                  // Update last indexed time
                  return indexStateRef.set(
                    {
                      themeTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                  );
                });
            });
          })
        );
      });
  });
