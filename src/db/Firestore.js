import { useParams } from "react-router-dom";

export default function useFirestore() {
  const db = window.firebase.firestore();
  const { orgID, personID, documentID, datasetID } = useParams();

  let r = {};

  if (orgID) {
    r.orgRef = db.collection("organizations").doc(orgID);

    r.allTagsRef = db.collectionGroup("tags");
    r.allHighlightsRef = db.collectionGroup("highlights");

    r.apiKeysRef = r.orgRef.collection("apiKeys");
    r.datasetsRef = r.orgRef.collection("datasets");
    r.documentsRef = r.orgRef.collection("documents");
    r.membersRef = r.orgRef.collection("members");
    r.peopleRef = r.orgRef.collection("people");
    r.tagGroupsRef = r.orgRef.collection("tagGroups");

    if (datasetID) {
      r.datasetRef = r.datasetsRef.doc(datasetID);
      r.cardsRef = r.datasetRef.collection("cards");
      r.groupsRef = r.datasetRef.collection("groups");
      r.activeUsersRef = r.datasetRef.collection("activeUsers");
    }

    if (documentID) {
      r.documentRef = r.documentsRef.doc(documentID);
      r.deltasRef = r.documentRef.collection("deltas");
      r.highlightsRef = r.documentRef.collection("highlights");
    }

    if (personID) {
      r.personRef = r.peopleRef.doc(personID);
    }
  }

  return r;
}
