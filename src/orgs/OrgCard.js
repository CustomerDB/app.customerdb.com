import React, { useContext, useEffect, useState } from "react";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import FirebaseContext from "../util/FirebaseContext.js";
import { useNavigate } from "react-router-dom";
import LinearProgress from "@material-ui/core/LinearProgress";

export default function OrgCard({ orgID, claimsReady }) {
  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();
  const [org, setOrg] = useState();
  const [numMembers, setNumMembers] = useState();
  const navigate = useNavigate();

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

  let members;
  if (numMembers) {
    members = `${numMembers} members`;
  }
  if (numMembers === 1) {
    members = `${numMembers} member`;
  }

  if (!org) {
    return <></>;
  }

  const ready = org.ready && claimsReady;

  return (
    <Card
      style={{
        margin: "1rem",
        borderRadius: "0.5rem",
        maxHeight: "10rem",
        width: "20rem",
        cursor: ready ? "pointer" : "",
      }}
      onClick={() => {
        if (ready) {
          navigate(`/orgs/${orgID}`);
        }
      }}
    >
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          style={{ fontWeight: "bold", color: ready ? "black" : "grey" }}
        >
          {org.name}
        </Typography>
        {!ready && <LinearProgress />}
        {members}
      </CardContent>
    </Card>
  );
}
