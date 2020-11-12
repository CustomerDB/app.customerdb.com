const admin = require("firebase-admin");
const Delta = require("quill-delta");

const NOTES = "notes";
const TRANSCRIPT = "transcript";

exports.deltaToPlaintext = (delta) => {
  return delta.reduce(function (text, op) {
    if (!op.insert) return text;
    if (typeof op.insert !== "string") return text + " ";
    return text + op.insert;
  }, "");
};

exports.revisionAtTime = (orgID, documentID, source, timestamp) => {
  console.debug(
    "util.revisionAtTime:",
    orgID,
    documentID,
    source,
    JSON.stringify(timestamp)
  );

  if (![NOTES, TRANSCRIPT].includes(source)) {
    throw `source parameter must be one of "${NOTES}" or "${TRANSCRIPT}"`;
  }

  const { revisionsRef, deltasRef } = contentRefs(orgID, documentID, source);

  const revisionPromise = revisionsRef
    .where("timestamp", "<=", timestamp)
    .orderBy("timestamp", "desc")
    .limit(1)
    .get()
    .then((snapshot) => {
      if (snapshot.size === 0) {
        return {
          delta: new Delta([{ insert: "\n" }]),
          timestamp: new admin.firestore.Timestamp(0, 0),
        };
      }
      const data = snapshot.docs[0].data();
      return {
        delta: new Delta(data.delta.ops),
        timestamp: data.timestamp,
      };
    });

  return revisionPromise.then((revision) => {
    console.debug("util.revisionAtTime -- revision", JSON.stringify(revision));
    return deltasRef
      .where("timestamp", "<=", timestamp)
      .where("timestamp", ">", revision.timestamp)
      .orderBy("timestamp", "asc")
      .get()
      .then((snapshot) => {
        // apply uncompacted deltas to revision delta.
        let result = revision.delta;

        console.debug(
          `util.revisionAtTime -- applying ${snapshot.size} deltas`
        );

        snapshot.forEach((doc) => {
          let deltaDoc = doc.data();
          let delta = new Delta(deltaDoc.ops);
          result = result.compose(delta);
        });

        console.debug("util.revisionAtTime -- result", JSON.stringify(result));
        return result;
      });
  });
};

const contentRefs = (orgID, documentID, source) => {
  const db = admin.firestore();
  const documentRef = db
    .collection("organizations")
    .doc(orgID)
    .collection("documents")
    .doc(documentID);

  if (source === NOTES)
    return {
      revisionsRef: documentRef.collection("revisions"),
      deltasRef: documentRef.collection("deltas"),
    };

  if (source === TRANSCRIPT)
    return {
      revisionsRef: documentRef.collection("transcriptRevisions"),
      deltasRef: documentRef.collection("transcriptDeltas"),
    };

  return {};
};
