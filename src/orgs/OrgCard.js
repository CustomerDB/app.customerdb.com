import React, { useContext, useEffect, useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import FirebaseContext from "../util/FirebaseContext.js";
import { Link } from "react-router-dom";

export default function OrgCard({ orgID }) {
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();
  const [org, setOrg] = useState();
  const [numMembers, setNumMembers] = useState();

  useEffect(() => {
    if (!db || !orgID) {
      return;
    }
    return db
      .collection("organizations")
      .doc(orgID)
      .onSnapshot((doc) => setOrg(doc.data()));
  }, [db, orgID]);

  useEffect(() => {
    if (!db || !orgID) {
      return;
    }
    return db
      .collection("organizations")
      .doc(orgID)
      .collection("members")
      .onSnapshot((snapshot) => setNumMembers(snapshot.size));
  }, [db, orgID]);

  const linkedTitle = org && (
    <Link style={{ color: "black" }} to={`/orgs/${orgID}`}>
      {org.name}
    </Link>
  );

  let members;
  if (numMembers) {
    members = `${numMembers} members`;
  }
  if (numMembers === 1) {
    members = `${numMembers} member`;
  }

  return (
    <Card
      style={{
        margin: "1rem",
        borderRadius: "0.5rem",
        maxHeight: "10rem",
        width: "20rem",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
          {linkedTitle}
        </Typography>
        {members}
      </CardContent>
    </Card>
  );
}
