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

import { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import { useParams } from "react-router-dom";

export default function useFirestore() {
  const { orgID, personID, documentID, boardID, summaryID } = useParams();
  const [orgRefs, setOrgRefs] = useState({});
  const [boardRefs, setBoardRefs] = useState({});
  const [documentRefs, setDocumentRefs] = useState({});
  const [summaryRefs, setSummaryRefs] = useState({});
  const [personRefs, setPersonRefs] = useState({});

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  useEffect(() => {
    if (!orgID) {
      setOrgRefs({});
      return;
    }
    let r = {};
    r.orgRef = db.collection("organizations").doc(orgID);
    r.allTagsRef = db.collectionGroup("tags");
    r.allHighlightsRef = db.collectionGroup("highlights");
    r.allTranscriptHighlightsRef = db.collectionGroup("transcriptHighlights");
    r.apiKeysRef = r.orgRef.collection("apiKeys");
    r.boardsRef = r.orgRef.collection("boards");
    r.documentsRef = r.orgRef.collection("documents");
    r.summariesRef = r.orgRef.collection("summaries");
    r.callsRef = r.orgRef.collection("calls");
    r.membersRef = r.orgRef.collection("members");
    r.peopleRef = r.orgRef.collection("people");
    r.tagGroupsRef = r.orgRef.collection("tagGroups");
    r.templatesRef = r.orgRef.collection("templates");
    r.transcriptionsRef = r.orgRef.collection("transcriptions");
    setOrgRefs(r);
  }, [db, orgID]);

  useEffect(() => {
    if (!boardID || !orgRefs.boardsRef) {
      setBoardRefs({});
      return;
    }
    let r = {};
    r.boardRef = orgRefs.boardsRef.doc(boardID);
    r.cardsRef = r.boardRef.collection("cards");
    r.themesRef = r.boardRef.collection("themes");
    setBoardRefs(r);
  }, [orgRefs.boardsRef, boardID]);

  useEffect(() => {
    if (!documentID || !orgRefs.documentsRef) {
      setDocumentRefs({});
      return;
    }
    let r = {};
    r.documentRef = orgRefs.documentsRef.doc(documentID);
    r.highlightsRef = r.documentRef.collection("highlights");
    r.transcriptHighlightsRef = r.documentRef.collection(
      "transcriptHighlights"
    );
    setDocumentRefs(r);
  }, [orgRefs.documentsRef, documentID]);

  useEffect(() => {
    if (!personID || !orgRefs.peopleRef) {
      setPersonRefs({});
      return;
    }
    let r = {};
    r.personRef = orgRefs.peopleRef.doc(personID);
    setPersonRefs(r);
  }, [orgRefs.peopleRef, personID]);

  useEffect(() => {
    if (!summaryID || !orgRefs.summariesRef) {
      setSummaryRefs({});
      return;
    }
    let r = {};
    r.summaryRef = orgRefs.summariesRef.doc(summaryID);
    setSummaryRefs(r);
  }, [orgRefs.summariesRef, summaryID]);

  return {
    ...orgRefs,
    ...boardRefs,
    ...documentRefs,
    ...personRefs,
    ...summaryRefs,
  };
}
