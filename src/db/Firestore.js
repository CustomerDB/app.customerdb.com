import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function useFirestore() {
  const db = window.firebase.firestore();
  const { orgID, personID, documentID, analysisID } = useParams();
  const [refs, setRefs] = useState({});

  useEffect(() => {
    if (!orgID) return;

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

    if (analysisID) {
      r.analysisRef = r.analysesRef.doc(analysisID);
      r.cardsRef = r.analysisRef.collection("cards");
      r.groupsRef = r.analysisRef.collection("groups");
      r.activeUsersRef = r.analysisRef.collection("activeUsers");
    }

    if (documentID) {
      r.documentRef = r.documentsRef.doc(documentID);
      r.deltasRef = r.documentRef.collection("deltas");
      r.highlightsRef = r.documentRef.collection("highlights");
    }

    if (personID) {
      r.personRef = r.peopleRef.doc(personID);
    }

    setRefs(r);
  }, [db, orgID, personID, documentID, analysisID]);

  return refs;
}
