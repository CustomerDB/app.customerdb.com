const admin = require("firebase-admin");
const functions = require("firebase-functions");
const algoliasearch = require("algoliasearch");
const IntervalTree = require("@flatten-js/interval-tree").default;
const transcript = require("./transcript/timecodes.js");
const util = require("./util.js");
const Delta = require("quill-delta");
const tmp = require("tmp");
const fs = require("fs");
const { PredictionServiceClient } = require("@google-cloud/automl").v1;

// Compute highlight suggestions when a new revision is written.
exports.highlights = functions.firestore
  .document(
    "organizations/{orgID}/documents/{documentID}/revisions/{revisionID}"
  )
  .onCreate((doc, context) => {
    const revision = doc.data();
    const revisionID = doc.id;
    const documentRef = doc.ref.parent.parent;
    const suggestionsRef = documentRef.collection("suggestions");
    const revisionDelta = new Delta(revision.delta.ops);
    const revisionText = util.deltaToPlaintext(revisionDelta);
    const revisionSentences = revisionText.split(/[.!?\n]/);

    const projectID = functions.config().suggest.highlight.project_id;
    const location = functions.config().suggest.highlight.location;
    const model = functions.config().suggest.highlight.model;

    const MIN_SENTENCE_LENGTH = 8;

    let suggestions = [];

    let indexStart = 0;
    let indexEnd = 0;
    for (let i = 0; i < revisionSentences.length; i++) {
      const s = revisionSentences[i];
      indexEnd += s.length;
      suggestions.push({
        selection: {
          index: indexStart,
          length: indexEnd - indexStart,
        },
        accepted: false,
        rejected: false,
        revisionID: revisionID,
      });
      indexStart = indexEnd + 1;
      indexEnd = indexStart;
    }

    const modelClient = new PredictionServiceClient();

    // TODO(CD): clear old suggestions or somehow update in-place

    return Promise.all(
      suggestions.map((suggestion, i) => {
        const sentence = revisionSentences[i];
        if (sentence.length < MIN_SENTENCE_LENGTH) return Promise.resolve();

        const request = {
          name: client.modelPath(projectID, location, model),
          payload: {
            textSnippet: {
              content: sentence,
              mimeType: "text/plain",
            },
          },
        };
        return modelClient.predict(request).then(([response]) => {
          suggestion.prediction = {};
          response.payload.forEach((annotation) => {
            suggestion.prediction[annotation.displayName] =
              annotationPayload.classification.score;
          });
          return suggestionsRef.doc().set(suggestion);
        });
      })
    );
  });
