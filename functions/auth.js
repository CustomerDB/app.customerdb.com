const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(functions.config().sendgrid.api_key);

exports.sendSignupEmail = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onCreate((snapshot, context) => {
    let member = snapshot.data();
    let email = context.params.email;
    let orgID = context.params.orgID;
    let baseURL = functions.config().invite_email.base_url;

    if (member.invited && !member.active) {
      let urlEncodedEmail = encodeURIComponent(email);

      const db = admin.firestore();
      const orgRef = db.collection("organizations").doc(orgID);

      return orgRef
        .get()
        .then((doc) => {
          let org = doc.data();
          return org.name;
        })
        .then((orgName) => {
          let signupLink = `${baseURL}/signup?email=${urlEncodedEmail}`;
          const msg = {
            to: email,
            from: "hello@customerdb.com",
            subject: `Join CustomerDB Organization ${orgName}`,
            text: `Open ${signupLink} in a browser to get started`,
            html: `<a href="${signupLink}">Get started</a> with CustomerDB`,
          };

          return sgMail.send(msg);
        });
    }
  });

function sendVerifyEmail(email) {
  return admin
    .auth()
    .getUserByEmail(email)
    .then((userRecord) => {
      // Check that the email hasn't already been verified.
      if (userRecord.emailVerified) {
        console.debug("email already verified -- quitting");
        return;
      }

      let baseURL = functions.config().invite_email.base_url;
      let urlEncodedEmail = encodeURIComponent(email);

      let actionCodeSettings = {
        url: `${baseURL}/verify?email=${urlEncodedEmail}`,
        handleCodeInApp: true,
      };
      return admin
        .auth()
        .generateSignInWithEmailLink(email, actionCodeSettings)
        .then((link) => {
          const msg = {
            to: email,
            from: "hello@customerdb.com",
            subject: `Verify your email for CustomerDB`,
            text: `Click ${link} in a browser to verify your email`,
            html: `<a href="${link}">Click here</a> to verify your email with CustomerDB`,
          };

          return sgMail.send(msg);
        });
    });
}

exports.sendVerifyEmail = functions.https.onCall((data, context) => {
  // We expect a user to have logged in successfully before requesting a new verification email.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  return sendVerifyEmail(context.auth.token.email);
});

exports.signupEmail = functions.https.onCall((data, context) => {
  if (!data.name || !data.email || !data.password) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "name, email and password required"
    );
  }

  let name = data.name;
  let email = data.email;
  let password = data.password;

  console.debug(`Looking up email ${email}`);

  return admin
    .auth()
    .getUserByEmail(email)
    .then((userRecord) => {
      console.debug("Found existing record for ${email} - aborting");
      throw new functions.https.HttpsError(
        "already-exists",
        `user already exists`
      );
    })
    .catch((error) => {
      if (error.code !== "auth/user-not-found") {
        throw new functions.https.HttpsError("internal", error);
      }

      let db = admin.firestore();
      let membersRef = db
        .collectionGroup("members")
        .where("email", "==", email)
        .where("invited", "==", true);
      return membersRef.get().then((snapshot) => {
        if (snapshot.size === 0) {
          throw new functions.https.HttpsError("internal", "user not invited");
        }

        console.debug(`Creating user for email ${email}`);

        // Create firebase user.
        return admin
          .auth()
          .createUser({
            email: email,
            emailVerified: false,
            password: password,
            displayName: name,
            disabled: false,
          })
          .catch((err) => {
            console.error(`Could not create user ${email}: ${err}`);
            throw new functions.https.HttpsError(
              "internal",
              "user not created"
            );
          })
          .then(() => {
            // Send the verify email email.
            return sendVerifyEmail(email);
          });
      });
    });
});

exports.signupGoogle = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  // Detect whether user already have access to an organization.
  let db = admin.firestore();
  let email = context.auth.token.email;
  return db
    .collectionGroup("members")
    .where("email", "==", email)
    .where("active", "==", true)
    .get()
    .then((activeSnapshot) => {
      if (activeSnapshot.size !== 0) {
        // User already have access to an org and should be redirected to the orgs page.
        throw new functions.https.HttpsError("internal", "user already exists");
      }

      return db
        .collectionGroup("members")
        .where("email", "==", email)
        .where("invited", "==", true)
        .get()
        .then((invitedSnapshot) => {
          if (invitedSnapshot.size === 0) {
            throw new functions.https.HttpsError(
              "internal",
              "user not invited"
            );
          }

          return {};
        });
    });
});

// Returns an array of organization objects, each with
// name, ID, and the timestamp of when the user was invited.
exports.getInvitedOrgs = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  if (!context.auth.token.email_verified) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Email verification required."
    );
  }

  const db = admin.firestore();
  return db
    .collectionGroup("members")
    .where("email", "==", context.auth.token.email)
    .where("invited", "==", true)
    .get()
    .then((snapshot) => {
      return Promise.all(
        snapshot.docs.map((memberDoc) => {
          const member = memberDoc.data();
          const orgRef = memberDoc.ref.parent.parent;
          return orgRef.get().then((orgDoc) => {
            let org = orgDoc.data();
            return {
              inviteSentTimestamp: member.inviteSentTimestamp,
              orgID: orgDoc.id,
              orgName: org.name,
            };
          });
        })
      );
    });
});

// Authentication trigger adds custom claims to the user's auth token
// when members are written
exports.installMemberOAuthClaim = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    console.debug("handling update (params):", context.params);

    let before = change.before.data();
    let after = change.after.data();

    let email = context.params.email;
    let orgID = context.params.orgID;

    console.debug(`getting user record for ${email} to read custom claims`);
    return admin
      .auth()
      .getUserByEmail(email)
      .then((userRecord) => {
        let oldClaims = userRecord.customClaims;

        let uid = userRecord.uid;

        console.debug(`found existing custom claims for ${uid}`, oldClaims);

        let oldOrgs = (oldClaims && oldClaims.orgs) || {};

        // Remove custom claims if necessary.
        // only delete claims for this orgID.
        let memberRecordDeleted = !change.after.exists;
        if (memberRecordDeleted) {
          let newOrgs = Object.assign(oldOrgs, {});
          delete newOrgs[context.params.orgID];
          let newClaims = { orgs: newOrgs };
          console.debug(`member record deleted -- updating custom claims`);
          return admin.auth().setCustomUserClaims(uid, newClaims);
        }

        let memberInactive = !after.active;
        if (memberInactive) {
          console.debug(`member is inactive -- deleting custom claims`);
          let newOrgs = Object.assign(oldOrgs, {});
          delete newOrgs[context.params.orgID];
          let newClaims = { orgs: newOrgs };
          return admin.auth().setCustomUserClaims(uid, newClaims);
        }

        let missingClaims =
          !oldClaims ||
          !oldClaims.orgID ||
          !oldClaims.admin ||
          !oldClaims.orgs ||
          !oldClaims.orgs[orgID];

        // True if the user is an active org member (should have claims)
        // but does not have claims for any reason.
        let needsClaims = after.active && missingClaims;

        // True if a user is writing their own member uid (join org operation)
        let memberJoined = !before.uid && before.uid !== after.uid;

        // True if the member admin bit changed
        let adminChanged = before.admin !== after.admin;

        if (needsClaims || memberJoined || adminChanged) {
          let newOrg = {};
          newOrg[context.params.orgID] = { admin: after.admin };
          let newOrgs = Object.assign(oldOrgs, newOrg);

          // Add custom claims if necessary.
          let newCustomClaims = {
            orgID: context.params.orgID,
            admin: after.admin,
            orgs: newOrgs,
          };

          console.debug("writing new custom claims", newCustomClaims);

          // Set custom claims for the user.
          return admin
            .auth()
            .setCustomUserClaims(uid, newCustomClaims)
            .then(() => {
              console.debug(`triggering token refresh for /uids/${uid}`);
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
                  console.debug("done triggering token refresh");
                });
            });
        }
      });
  });
