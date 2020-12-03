const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const algoliasearch = require("algoliasearch");
const Delta = require("quill-delta");
const { v4: uuidv4 } = require("uuid");
const util = require("./util.js");

const firestore = require("@google-cloud/firestore");
const adminClient = new firestore.v1.FirestoreAdminClient();

admin.initializeApp();

exports.auth = require("./auth");
exports.repairJobs = require("./repairJobs");
exports.highlightIndex = require("./highlightIndexer.js");
exports.video = require("./video");
exports.garbageCollection = require("./garbageCollection");
exports.transcript = require("./transcript");
exports.twilio = require("./twilio");
exports.waitList = require("./waitlist");
exports.dataExport = require("./dataExport");
exports.search = require("./search");
exports.people = require("./people");
