import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import useFirestore from "../db/Firestore.js";

export default function useDefaultTagGroupID() {
  const { orgID } = useParams();
  const { orgRef } = useFirestore();
  const [defaultTagGroupID, setDefaultTagGroupID] = useState([]);

  useEffect(() => {
    let unsubscribe = orgRef.onSnapshot((doc) => {
      let orgData = doc.data();
      setDefaultTagGroupID(orgData.defaultTagGroupID);
    });
    return unsubscribe;
  }, [orgID]);

  return defaultTagGroupID;
}
