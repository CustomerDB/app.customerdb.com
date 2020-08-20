import { useEffect, useState } from "react";

import React from "react";
import useFirestore from "../db/Firestore.js";

export default function OrganizationHome(props) {
  const [orgName, setOrgName] = useState();
  const { orgRef } = useFirestore();

  useEffect(() => {
    if (!orgRef) return;

    let unsubscribe = orgRef.onSnapshot((doc) => {
      let org = doc.data();
      setOrgName(org.name);
    });
    return unsubscribe;
  }, [orgRef]);

  if (!orgName) return <></>;

  return (
    <div>
      <h1>{orgName}</h1>
    </div>
  );
}
