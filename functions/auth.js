const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(functions.config().sendgrid.api_key);

exports.sendMemberEmail = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onCreate((snapshot, context) => {
    let member = snapshot.data();
    let email = context.params.email;
    let orgID = context.params.orgID;
    let baseURL = functions.config().invite_email.base_url;

    if (member.invited && !member.active) {
      let urlEncodedEmail = encodeURIComponent(email);
      let actionCodeSettings = {
        url: `${baseURL}/join/${orgID}?email=${urlEncodedEmail}`,
        handleCodeInApp: true,
      };

      const db = admin.firestore();
      const orgRef = db.collection("organizations").doc(orgID);

      return orgRef
        .get()
        .then((doc) => {
          let org = doc.data();
          return org.name;
        })
        .then((orgName) =>
          admin
            .auth()
            .generateSignInWithEmailLink(email, actionCodeSettings)
            .then((link) => {
              const msg = {
                to: email,
                from: "no-reply@quantap.com",
                subject: `Join CustomerDB Organization ${orgName}`,
                text: `Open ${link} in a browser to get started`,
                html: `<a href="${link}">Get started</a> with CustomerDB`,
              };

              return sgMail.send(msg);
            })
        );
    }
  });

// Authentication trigger adds custom claims to the user's auth token
// when members are written
exports.installMemberOAuthClaim = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    console.log("handling update (params):", context.params);

    let before = change.before.data();
    let after = change.after.data();

    let uid = before && before.uid ? before.uid : after && after.uid;

    if (!uid) {
      console.log("no uid -- terminating");
      return;
    }

    // Remove custom claims if necessary.
    // TODO(CD): only delete claims for this orgID.

    let memberRecordDeleted = !change.after.exists;
    if (memberRecordDeleted) {
      console.log(`member record deleted -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    let memberInactive = !after.active;
    if (memberInactive) {
      console.log(`member is inactive -- deleting custom claims`);
      return admin.auth().setCustomUserClaims(uid, null);
    }

    // Add custom claims if necessary.
    // TODO(CD): Make this work for multiple orgs

    let newCustomClaims = {
      orgID: context.params.orgID,
      admin: after.admin,
    };

    console.log(`getting user record ${uid} to read custom claims`);
    return admin
      .auth()
      .getUser(uid)
      .then((userRecord) => {
        let oldClaims = userRecord.customClaims;

        console.log(`found existing custom claims for ${uid}`, oldClaims);

        let missingClaims =
          !oldClaims || !("orgID" in oldClaims) || !("admin" in oldClaims);

        // True if the user is an active org member (should have claims)
        // but does not have claims for any reason.
        let needsClaims = after.active && missingClaims;

        // True if a user is writing their own member uid (join org operation)
        let memberJoined = !before.uid && before.uid !== after.uid;

        // True if the member admin bit changed
        let adminChanged = before.admin !== after.admin;

        if (needsClaims || memberJoined || adminChanged) {
          console.log("writing new custom claims", newCustomClaims);

          // Set custom claims for the user.
          return admin
            .auth()
            .setCustomUserClaims(uid, newCustomClaims)
            .then(() => {
              console.log(`triggering token refresh for /uids/${uid}`);
              // Touch the uid record (`/uids/{uid}`) to trigger id
              // token refresh in the client.
              //
              // NOTE: The client refresh trigger subscription is
              //       set up and handled in the WithOauthUser component.
              return admin
                .firestore()
                .collection("uids")
                .doc(uid)
                .set({
                  refreshTime: admin.firestore.FieldValue.serverTimestamp(),
                })
                .then(() => {
                  console.log("done triggering token refresh");
                });
            });
        }
      });
  });
