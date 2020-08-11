import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";
import Tabs from "../shell_obsolete/Tabs.js";

import { useParams, Link } from "react-router-dom";
import Moment from "react-moment";

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
      <br />
      <small>
        <i>
          <Moment format="MMM Do, YYYY" date={doc.creationTimestamp.toDate()} />
        </i>
        <br />
        {doc.createdBy}
      </small>
    </Tabs.SidePaneCard>
  ));

  return <Tabs.SidePane>{items}</Tabs.SidePane>;
}
