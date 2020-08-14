import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useParams } from "react-router-dom";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import DescriptionIcon from "@material-ui/icons/Description";
import Moment from "react-moment";
import { useNavigate } from "react-router-dom";

export default function PersonData(props) {
  const [docs, setDocs] = useState([]);
  const { orgID, personID } = useParams();
  const { documentsRef } = useFirestore();

  const navigate = useNavigate();

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
    <ListItem
      button
      key={doc.ID}
      onClick={() => {
        navigate(`/orgs/${orgID}/data/${doc.ID}`);
      }}
    >
      <ListItemAvatar>
        <Avatar>
          <DescriptionIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={doc.name}
        secondary={<Moment fromNow date={doc.creationTimestamp.toDate()} />}
      />
    </ListItem>
  ));

  return <List>{items}</List>;
}
