import { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import { useParams } from "react-router-dom";

export default function useFirestore() {
  const { orgID, personID, documentID, analysisID } = useParams();
  const [orgRefs, setOrgRefs] = useState({});
  const [analysisRefs, setAnalysisRefs] = useState({});
  const [documentRefs, setDocumentRefs] = useState({});
  const [personRefs, setPersonRefs] = useState({});

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  console.log("useParams ", useParams());

  useEffect(() => {
    console.log("useFirestore: found org ID: ", orgID);
    if (!orgID) {
      setOrgRefs({});
      return;
    }
    let r = {};
    r.orgRef = db.collection("organizations").doc(orgID);
    r.allTagsRef = db.collectionGroup("tags");
    r.allHighlightsRef = db.collectionGroup("highlights");
    r.apiKeysRef = r.orgRef.collection("apiKeys");
    r.analysesRef = r.orgRef.collection("analyses");
    r.documentsRef = r.orgRef.collection("documents");
    r.membersRef = r.orgRef.collection("members");
    r.peopleRef = r.orgRef.collection("people");
    r.tagGroupsRef = r.orgRef.collection("tagGroups");
    r.templatesRef = r.orgRef.collection("templates");
    r.transcriptionsRef = r.orgRef.collection("transcriptions");
    setOrgRefs(r);
  }, [db, orgID]);

  useEffect(() => {
    if (!analysisID || !orgRefs.analysesRef) {
      setAnalysisRefs({});
      return;
    }
    let r = {};
    r.analysisRef = orgRefs.analysesRef.doc(analysisID);
    r.cardsRef = r.analysisRef.collection("cards");
    r.groupsRef = r.analysisRef.collection("groups");
    r.activeUsersRef = r.analysisRef.collection("activeUsers");
    setAnalysisRefs(r);
  }, [orgRefs.analysesRef, analysisID]);

  useEffect(() => {
    if (!documentID || !orgRefs.documentsRef) {
      setDocumentRefs({});
      return;
    }
    let r = {};
    r.documentRef = orgRefs.documentsRef.doc(documentID);
    r.revisionsRef = r.documentRef.collection("revisions");
    r.deltasRef = r.documentRef.collection("deltas");
    r.highlightsRef = r.documentRef.collection("highlights");
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

  return {
    ...orgRefs,
    ...analysisRefs,
    ...documentRefs,
    ...personRefs,
  };
}
