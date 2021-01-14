const admin = require("firebase-admin");
const functions = require("firebase-functions");

function newCard(ID, highlight, source) {
  return {
    ID: ID,
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
    kind: "card",
    tagID: highlight.tagID,
    documentID: highlight.documentID,
    groupColor: "#000",
    textColor: "#FFF",
    source: source,
  };
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
  .document("organizations/{orgID}/analyses/{analysisID}")
  .onUpdate((change, context) => {
    let before = change.before.data();
    let after = change.after.data();
    const orgID = context.params.orgID;

    const db = admin.firestore();

    let analysisRef = change.after.ref;
    let cardsRef = analysisRef.collection("cards");

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
        snapshot.docs.map((doc) => {
          let data = doc.data();
          // Each highlight should have a card
          let cardRef = cardsRef.doc(doc.id);

          console.debug("Creating card for highlight", doc.id);

          return cardRef.get().then((cardDoc) => {
            if (!cardDoc.exists) {
              return cardRef.set(newCard(doc.id, data, source));
            }
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
                    console.log(
                      `${snapshot.size} highlights to create cards for`
                    );
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

    // TODO: Add cards when document is added.
    return Promise.all([cardCleanupPromise, cardCreationPromise]);
  });

function highlightUpdates(change, context, source) {
  const db = admin.firestore();
  const orgID = context.params.orgID;
  const documentID = context.params.documentID;
  const highlightID = context.params.highlightID;

  if (change.after.exists && !change.before.exists) {
    // A new highlight may need to be added (in a card) to boards which subscribes to this document.
    // Find analyses subscribing to this document.

    // TODO: Make documentIDs a collection group, so we don't have to traverse the analyses.
    return db
      .collection("organizations")
      .doc(orgID)
      .collection("analyses")
      .get()
      .then((snapshot) =>
        snapshot.docs.map((doc) => {
          let analysis = doc.data();
          let cardsRef = doc.ref.collection("cards");

          if (
            analysis.documentIDs &&
            analysis.documentIDs.includes(documentID)
          ) {
            let cardRef = cardsRef.doc(doc.id);

            console.debug(
              `Adding highlight ${highlightID} to analysis ${doc.id}`
            );

            return cardRef.set(
              newCard(highlightID, change.after.data(), source)
            );
          }
        })
      );
  }

  if (!change.after.exists) {
    // Remove card from boards which subscribes to this document.
    return db
      .collection("organizations")
      .doc(orgID)
      .collection("analyses")
      .get()
      .then((snapshot) =>
        snapshot.docs.map((doc) => {
          let analysis = doc.data();
          let cardsRef = doc.ref.collection("cards");

          if (
            analysis.documentIDs &&
            analysis.documentIDs.includes(documentID)
          ) {
            console.debug(
              `Removing highlight ${highlightID} to analysis ${doc.id}`
            );

            return cardsRef.doc(highlightID).delete();
          }
        })
      );
  }
}

exports.noteHighlightUpdates = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/highlights/{highlightID}"
  )
  .onWrite((change, context) => {
    return highlightUpdates(change, context, "notes");
  });

exports.transcriptHighlightUpdates = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/transcriptHighlights/{highlightID}"
  )
  .onWrite((change, context) => {
    return highlightUpdates(change, context, "transcript");
  });

function highlightCacheUpdates(change, context, source) {
  // Store the cache object in cards with that ID. Or clear if removed.
  const db = admin.firestore();
  const orgID = context.params.orgID;
  const documentID = context.params.documentID;
  const highlightID = context.params.highlightID;

  return db
    .collection("organizations")
    .doc(orgID)
    .collection("analyses")
    .get()
    .then((snapshot) =>
      snapshot.docs.map((doc) => {
        let analysisRef = doc.ref;
        let analysis = doc.data();
        if (analysis.documentIDs && analysis.documentIDs.includes(documentID)) {
          return analysisRef
            .collection("cards")
            .doc(highlightID)
            .get()
            .then((doc) => {
              let card;
              if (!doc.exists && change.after.exists) {
                let cache = change.after.data();
                card = newCard(highlightID, cache, source);
                card.highlightHitCache = cache;
              }

              if (doc.exists && change.after.exists) {
                card = doc.data();
                card.highlightHitCache = cache;
              }

              if (doc.exists && !change.after.exists) {
                card = doc.data();
                delete card["highlightHitCache"];
              }

              return analysisRef.collection("cards").doc(highlightID).set(card);
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

function deleteGroupForSingleCard(groupRef, cardsRef) {
  return groupRef
    .collection("cardIDs")
    .get()
    .then((snapshot) => {
      if (snapshot.size < 2) {
        // Unset group information in the card.
        let cardPromise = Promise.resolve();
        if (snapshot.size === 1) {
          let cardID = snapshot.docs[0].id;
          cardPromise = cardsRef.doc(cardID).update({
            groupID: "",
          });
        }

        return cardPromise.then(() =>
          Promise.all(snapshot.docs.map((doc) => doc.ref.delete())).then(() =>
            groupRef.delete()
          )
        );
      }
    });
}

exports.cardUpdates = functions.firestore
  .document("organizations/{orgID}/analyses/{analysisID}/cards/{cardID}")
  .onWrite((change, context) => {
    const db = admin.firestore();
    const orgID = context.params.orgID;
    const analysisID = context.params.analysisID;
    const cardID = context.params.cardID;

    let groupsRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("analyses")
      .doc(analysisID)
      .collection("groups");

    let cardsRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("analyses")
      .doc(analysisID)
      .collection("cards");

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

    // Update group membership.
    let updatePromise = Promise.resolve();
    let membershipChanged = false;

    // See whether group changed for the card.
    if (change.before.exists && change.after.exists) {
      let before = change.before.data();
      let after = change.after.data();

      if (before.groupID !== after.groupID) {
        membershipChanged = true;

        if (after.groupID) {
          let groupRef = groupsRef.doc(after.groupID);
          updatePromise = groupRef.collection("cardIDs").doc(after.ID).set({
            ID: after.ID,
          });
        }
      }
    }

    let groupCleanupPromise = updatePromise.then(() => {
      // If a card has changed groups or just deleted, verify the source group for any existing cards. If only one, delete.
      if (change.before.exists && (membershipChanged || !change.after.exists)) {
        // Remove from group.
        let before = change.before.data();
        if (before.groupID) {
          let groupRef = groupsRef.doc(before.groupID);
          return groupRef
            .collection("cardIDs")
            .doc(before.ID)
            .delete()
            .then(() => deleteGroupForSingleCard(groupRef, cardsRef));
        }
      }
    });

    return Promise.all([hitPromise, groupCleanupPromise]);
    // TODO: In some cases, a group is broken by a card move. Detect this by recalculating intersections.
  });
