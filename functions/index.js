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

const admin = require("firebase-admin");

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
exports.suggest = require("./suggest");
exports.transcript = require("./transcript");
exports.twilio = require("./twilio");
exports.video = require("./video");
exports.waitList = require("./waitlist");
exports.themes = require("./themes");
exports.slackHooks = require("./slackHooks");
