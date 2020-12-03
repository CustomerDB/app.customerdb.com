const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const Delta = require("quill-delta");
const util = require("./util.js");

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
