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
