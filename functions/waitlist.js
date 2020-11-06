const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const client = require("@sendgrid/client");

function recaptcha(captchaToken) {
  let body =
    "secret=" +
    functions.config().recaptcha.secret +
    "&response=" +
    captchaToken;
  return fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body,
  }).then((response) => {
    return response.json();
  });
}

function createSendgridContact(email, source) {
  client.setApiKey(functions.config().sendgrid.api_key);

  let custom_fields = {};
  custom_fields[functions.config().sendgrid.custom_field_id] = source;

  const request = {
    method: "PUT",
    url: "/v3/marketing/contacts",
    body: {
      list_ids: [functions.config().sendgrid.list_id],
      contacts: [
        {
          email: email,
          custom_fields: custom_fields,
        },
      ],
    },
  };

  return client
    .request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(body);
      return response.statusCode > 200 && response.statusCode < 300;
    })
    .catch((err) => {
      console.error(err);
      return false;
    });
}

exports.signup = functions.https.onCall((data, context) => {
  if (!data.email || !data.captchaToken) {
    throw Error("Email and captcha required");
  }

  let db = admin.firestore();
  let waitlistRef = db.collection("waitlist");

  const email = data.email;
  const captchaToken = data.captchaToken;

  let emailRef = waitlistRef.doc(email);
  return emailRef
    .set({
      email: email,
      captchaToken: captchaToken,
      creationTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
    .then(() => {
      // Validate captcha
      return recaptcha(captchaToken).then((result) => {
        let threshold = functions.config().recaptcha.threshold;

        return emailRef
          .update({
            captchaScore: result.score,
            captchaResult: result.success,
          })
          .then(() => {
            if (!result.success || result.score < threshold) {
              // Didn't pass captcha gate.
              throw `${email} didn't pass recaptcha gate. result ${result.success} score ${result.score}`;
            }

            return createSendgridContact(email, "waitlist-beta").then(() => {
              return emailRef.update({
                contactCreatedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
          });
      });
    });
});
