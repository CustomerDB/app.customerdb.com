import { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

export function useOrganization() {
  const { orgRef } = useFirestore();
  const [org, setOrg] = useState({});

  useEffect(() => {
    if (!orgRef) return;
    return orgRef.onSnapshot((doc) => {
      if (doc.exists) setOrg(doc.data());
    });
  }, [orgRef]);

  return org;
}
