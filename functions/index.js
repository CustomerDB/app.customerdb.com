const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fs = require("fs");
const Delta = require("quill-delta");
const util = require("./util.js");

admin.initializeApp();

exports.auth = require("./auth");
exports.dataExport = require("./dataExport");
exports.documentIndexer = require("./documentIndexer");
exports.garbageCollection = require("./garbageCollection");
exports.highlightIndex = require("./highlightIndexer");
exports.organizations = require("./organizations");
exports.people = require("./people");
exports.repairJobs = require("./repairJobs");
exports.search = require("./search");
exports.transcript = require("./transcript");
exports.twilio = require("./twilio");
exports.video = require("./video");
exports.waitList = require("./waitlist");
