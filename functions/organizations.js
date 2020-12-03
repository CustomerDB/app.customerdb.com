const admin = require("firebase-admin");
const functions = require("firebase-functions");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

exports.createOrganization = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  // Only allow quantap accounts to act as super admin.
  if (!context.auth.token.email.endsWith("@quantap.com")) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Authentication required."
    );
  }

  if (!data.name || !data.email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "name and email arguments required."
    );
  }

  const name = data["name"];
  const email = data["email"].toLowerCase();

  let db = admin.firestore();

  const rawdata = fs.readFileSync("data/default_tags.json");
  const defaultTags = JSON.parse(rawdata);

  // 1) Create organization.
  return db
    .collection("organizations")
    .add({
      name: name,
    })
    .then((doc) => {
      console.debug("Creating first member");
      let orgID = doc.id;
      let orgRef = db.collection("organizations").doc(orgID);

      // 2) Create first member.
      return orgRef
        .collection("members")
        .doc(email)
        .set({
          email: email,
          invited: true,
          active: false,
          admin: true,
          inviteSentTimestamp: "",
          orgID: orgID,
        })
        .then((doc) => {
          console.debug("Creating tag groups");
          // 3) Create default tag group

          return Promise.all(
            defaultTags["tagGroups"].map((tagGroup) => {
              return orgRef
                .collection("tagGroups")
                .add({
                  createdBy: email,
                  creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                  deletionTimestamp: "",
                  name: tagGroup["name"],
                })
                .then((doc) => {
                  let tagGroupID = doc.id;
                  let tagGroupRef = orgRef
                    .collection("tagGroups")
                    .doc(tagGroupID);

                  console.debug("Creating tags");

                  // 4) Create default tags.
                  let tagPromises = tagGroup["tags"].map((tag) => {
                    let tagDocument = {
                      ID: uuidv4(),
                      color: tag.color,
                      textColor: tag.textColor,
                      name: tag.name,
                      organizationID: orgID,
                      createdBy: email,
                      tagGroupID: tagGroupID,
                      creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
                      deletionTimestamp: "",
                    };
                    tagGroupRef
                      .collection("tags")
                      .doc(tagDocument.ID)
                      .set(tagDocument);
                  });

                  return Promise.all(tagPromises).then(() => {
                    if (!tagGroup.default) {
                      return;
                    }

                    console.debug("Set default tag group");

                    // 5) After creating tag group. Set the default tag group.
                    return orgRef.update({
                      defaultTagGroupID: tagGroupID,
                    });
                  });
                });
            })
          );
        });
    })
    .then(() => {
      return "OK";
    });
});
