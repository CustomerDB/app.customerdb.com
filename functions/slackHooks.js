const functions = require("firebase-functions");
const admin = require("firebase-admin");

const { IncomingWebhook } = require("@slack/webhook");
const marketingURL = functions.config().slack
  ? functions.config().slack.marketing_webhook_url
  : undefined;
const marketingWebhook = new IncomingWebhook(marketingURL);

exports.organizationCreated = functions.firestore
  .document("organizations/{orgID}")
  .onCreate((orgDoc, context) => {
    let orgData = orgDoc.data();

    return marketingWebhook.send({
      text: `${orgData.adminEmail} created organization "${orgData.name}" with ${orgData.teamEmails.length} team members`,
    })
  })

exports.memberInvited = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    let orgID = context.params.orgID;
    let email = context.params.email;

    // Get organization name.
    let db = admin.firestore();
    let orgRef = db.collection("organizations").doc(orgID);

    return orgRef.get().then(doc => {
      let orgData = doc.data();
      if (change.after.exists) {
        let member = change.after.data();
        if (!member.active && member.invited) {
          return marketingWebhook.send({
            text: `${email} invited to "${orgData.name}"`,
          })
        }
  
        if (member.active && !member.invited) {
          return marketingWebhook.send({
            text: `${email} joined "${orgData.name}"`,
          })
        }
      }
    })
  })