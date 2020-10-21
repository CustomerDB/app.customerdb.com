const functions = require("firebase-functions");
const AccessToken = require("twilio").jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const MAX_ALLOWED_SESSION_DURATION = 14400;
const twilioAccountSid = functions.config().twilio.account_sid;
const twilioApiKeySID = functions.config().twilio.api_key_sid;
const twilioApiKeySecret = functions.config().twilio.api_key_secret;

exports.getAccessToken = functions.https.onCall((data, context) => {
  // Require authenticated requests
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }
  console.log("Received data: ", data);
  const identity = context.auth.token.email;
  const orgID = context.auth.token.orgID;
  const token = new AccessToken(
    twilioAccountSid,
    twilioApiKeySID,
    twilioApiKeySecret,
    {
      ttl: MAX_ALLOWED_SESSION_DURATION,
    }
  );
  token.identity = identity;
  const videoGrant = new VideoGrant({ room: orgID });
  token.addGrant(videoGrant);
  console.log(`issued token for ${identity} in room ${orgID}`);
  return { identity: identity, token: token.toJwt() };
});
