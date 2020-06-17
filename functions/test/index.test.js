const test = require('firebase-functions-test')({
    databaseURL: "https://webapp-af09a.firebaseio.com",
    storageBucket: "webapp-af09a.appspot.com",
    projectId: "webapp-af09a",
}, '/home/niklas/.quantap/webapp-secret.json');

const functions = require('../index.js');
const assert = require('assert');
const sinon = require('sinon');

describe('parseCSV', function () {
    it('should not crash when parsing a valid CSV', function () {
        let dataset = {
            collection: function() {
                return {
                    doc: function() {}
                }
            },
            set: function(input) {}
        };

        let db = {
            batch: function() {
                return {
                    set: function(ref, input) {},
                    commit: function() {}
                }
            }
        };

        assert.doesNotReject(functions.parseCSV(db, dataset, "./test/dataset-01.csv"));
    })
})