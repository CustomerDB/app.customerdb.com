// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
    });
  });

exports.memberEvents = functions.firestore
  .document("organizations/{orgID}/members/{email}")
  .onWrite((change, context) => {
    let orgID = context.params.orgID;
    let email = context.params.email;

    // Get organization name.
    let db = admin.firestore();
    let orgRef = db.collection("organizations").doc(orgID);

    return orgRef.get().then((doc) => {
      let orgData = doc.data();
      if (change.after.exists) {
        let member = change.after.data();
        if (!member.active && member.invited) {
          return marketingWebhook.send({
            text: `${email} invited to "${orgData.name}"`,
          });
        }

        let activeBefore = true;
        if (change.before.exists) {
          let before = change.before.data();
          activeBefore = before.active;
        }

        if (member.active && !activeBefore) {
          return marketingWebhook.send({
            text: `${email} joined "${orgData.name}"`,
          });
        }
      }
    });
  });
