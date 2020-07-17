const test = require("firebase-functions-test")(
  {
    databaseURL: "https://customerdb-production.firebaseio.com",
    storageBucket: "customerdb-production.appspot.com",
    projectId: "customerdb-production",
  },
  `${process.env.HOME}/.quantap/customerdb-production-secret.json`
);

const functions = require("../index.js");
const assert = require("assert");
const sinon = require("sinon");

describe("parseCSV", function () {
  it("should not crash when parsing a valid CSV", function () {
    let dataset = {
      collection: function () {
        return {
          doc: function () {},
        };
      },
      set: function (input) {},
    };

    let db = {
      batch: function () {
        return {
          set: function (ref, input) {},
          commit: function () {},
        };
      },
    };

    assert.doesNotReject(
      functions.parseCSV(db, dataset, "./test/dataset-01.csv")
    );
  });
});
