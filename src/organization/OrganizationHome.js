import React from "react";

import useFirestore from "../db/Firestore.js";

import { useEffect, useState } from "react";

export default function OrganizationHome(props) {
  const [orgName, setOrgName] = useState(undefined);
  const { orgRef } = useFirestore();

  useEffect(() => {
    console.log("OrganizationHome useEffect");
    let unsubscribe = orgRef.onSnapshot((doc) => {
      let org = doc.data();
      setOrgName(org.name);
    });

    return unsubscribe;
  }, [orgRef]);

  return (
    <div>
      <h1>{orgName}</h1>
    </div>
  );
}
