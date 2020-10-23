const functions = require("firebase-functions");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const admin = require("firebase-admin");

const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = functions.config().twilio.account_sid;
const twilioApiKeySID = functions.config().twilio.api_key_sid;
const twilioApiKeySecret = functions.config().twilio.api_key_secret;

function getCallForGuest(callID, token) {
  let db = admin.firestore();
  let callRef = db.collectionGroup("calls").where("ID", "==", callID).limit(1);

  return callRef.get().then((snapshot) => {
    if (snapshot.docs.length == 0) {
      throw Error(`Call ${callID} doesn't exist`);
    }

    let call = snapshot.docs[0].data();

    if (call.token !== token) {
      throw Error(`Incorrect token for call ${data.callID}`);
    }

    return call;
  });
}

exports.getGuestAccessToken = functions.https.onCall((data, context) => {
  if (!data.callID) {
    throw Error("callID required");
  }

  if (!data.token) {
    throw Error("token required");
  }

  if (!data.name) {
    throw Error("name required");
  }

  return getCallForGuest(data.callID, data.token).then((call) => {
    let orgID = call.organizationID;
    let db = admin.firestore();
    let documentRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("documents")
      .doc(call.documentID);
    return documentRef.get().then((documentDoc) => {
      if (!documentDoc.exists) {
        throw Error(`Document ${call.documentID} doesn't exist`);
      }

      let document = documentDoc.data();

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      token.identity = data.name;
      const videoGrant = new VideoGrant({ room: data.callID });
      token.addGrant(videoGrant);

      return {
        accessToken: token.toJwt(),
        callName: document.name,
      };
    });
  });
});

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

  if (!data.callID) {
    throw Error("callID required");
  }

  let db = admin.firestore();
  let callRef = db
    .collectionGroup("calls")
    .where("ID", "==", data.callID)
    .limit(1);

  return callRef.get().then((snapshot) => {
    if (snapshot.docs.length == 0) {
      throw Error(`Call ${data.callID} doesn't exist`);
    }

    let call = snapshot.docs[0].data();

    if (orgID != call.organizationID) {
      throw Error(`Call ${data.callID} is not in the user's organization`);
    }

    let documentRef = db
      .collection("organizations")
      .doc(orgID)
      .collection("documents")
      .doc(call.documentID);
    return documentRef.get().then((documentDoc) => {
      if (!documentDoc.exists) {
        throw Error(`Document ${call.documentID} doesn't exist`);
      }

      let document = documentDoc.data();

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKeySID,
        twilioApiKeySecret,
        {
          ttl: MAX_ALLOWED_SESSION_DURATION,
        }
      );
      token.identity = identity;
      const videoGrant = new VideoGrant({ room: data.callID });
      token.addGrant(videoGrant);

      return {
        accessToken: token.toJwt(),
        callName: document.name,
      };
    });
  });
});

exports.getPreflightAccessTokens = functions.https.onCall((data, context) => {
  // Require authenticated requests

  // First case is for guest pre-flight tests.
  // The second case is for logged in users.
  let authorized = Promise.resolve();
  if (data.callID && data.token) {
    authorized = getCallForGuest(data.callID, data.token);
  } else if (
    !context.auth ||
    !context.auth.token ||
    !context.auth.token.orgID
  ) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  return authorized.then(() => {
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
});
