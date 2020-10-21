const functions = require("firebase-functions");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const admin = require("firebase-admin");

const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = functions.config().twilio.account_sid;
const twilioApiKeySID = functions.config().twilio.api_key_sid;
const twilioApiKeySecret = functions.config().twilio.api_key_secret;

exports.getInterviewAccessToken = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth || !context.auth.token || !context.auth.token.orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  const identity = context.auth.token.email;
  const orgID = context.auth.token.orgID;

  if (!data.documentID) {
    throw Error("documentID required");
  }

  let db = admin.firestore();

  let documentRef = db
    .collection("organizations")
    .doc(orgID)
    .collection("documents")
    .doc(data.documentID);

  return documentRef.get().then((doc) => {
    if (!doc.exists) {
      throw Error(`Document ${data.documentID} doesn't exist`);
    }

    const token = new AccessToken(
      twilioAccountSid,
      twilioApiKeySID,
      twilioApiKeySecret,
      {
        ttl: MAX_ALLOWED_SESSION_DURATION,
      }
    );
    token.identity = identity;
    const videoGrant = new VideoGrant({ room: data.documentID });
    token.addGrant(videoGrant);

    return {
      token: token.toJwt(),
    };
  });
});

exports.getPreflightAccessTokens = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth || !context.auth.token || !context.auth.token.orgID) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  if (!data.room || !data.publisherIdentity || !data.subscriberIdentity) {
    throw Error("room, publisherIdentity and subscriberIdentity required");
  }

  const videoGrant = new VideoGrant({ room: data.room });

  const publisherToken = new AccessToken(
    twilioAccountSid,
    twilioApiKeySID,
    twilioApiKeySecret,
    {
      ttl: MAX_ALLOWED_SESSION_DURATION,
    }
  );
  publisherToken.identity = data.publisherIdentity;
  publisherToken.addGrant(videoGrant);

  const subscriberToken = new AccessToken(
    twilioAccountSid,
    twilioApiKeySID,
    twilioApiKeySecret,
    {
      ttl: MAX_ALLOWED_SESSION_DURATION,
    }
  );
  subscriberToken.identity = data.subscriberIdentity;
  subscriberToken.addGrant(videoGrant);

  return {
    publisherToken: publisherToken.toJwt(),
    subscriberToken: subscriberToken.toJwt(),
  };
});
