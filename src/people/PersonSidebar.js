import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useParams, Link } from "react-router-dom";

import Tabs from "../shell/Tabs.js";

export default function PersonSidebar(props) {
  const [docs, setDocs] = useState([]);
  const { orgID, personID } = useParams();
  const { documentsRef } = useFirestore();

  useEffect(() => {
    if (!documentsRef || !personID) {
      return;
    }
    documentsRef
      .where("deletionTimestamp", "==", "")
      .where("personID", "==", personID)
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.log("snapshot of docs for", personID);
        let newDocs = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newDocs.push(data);
        });
        setDocs(newDocs);
      });
  }, [documentsRef, personID]);

  let items = docs.map((doc) => (
    <Tabs.SidePaneCard>
      <Link to={`/orgs/${orgID}/data/${doc.ID}`}>{doc.name}</Link>
    </Tabs.SidePaneCard>
  ));

  console.log("render", items);

  return <Tabs.SidePane>{items}</Tabs.SidePane>;
}
