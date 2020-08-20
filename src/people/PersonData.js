import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useParams } from "react-router-dom";
import List from "@material-ui/core/List";
import { makeStyles } from "@material-ui/core/styles";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import DescriptionIcon from "@material-ui/icons/Description";
import Moment from "react-moment";
import { useNavigate } from "react-router-dom";
import Card from "@material-ui/core/Card";
import Typography from "@material-ui/core/Typography";

import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles({
  dataList: {
    width: "100%",
  },
  card: {
    overflowWrap: "break-word",
    margin: "0.5rem",
    padding: "0.5rem",
  },
});

export default function PersonData(props) {
  const [docs, setDocs] = useState([]);
  const { orgID, personID } = useParams();
  const { documentsRef } = useFirestore();

  const classes = useStyles();

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

  return docs && docs.length > 0 ? (
    <Card className={classes.card}>
      <Typography gutterBottom variant="h6" component="h2">
        Data
      </Typography>
      <Grid container>
        <Grid container item xs={12}>
          <List className={classes.dataList}>{items}</List>
        </Grid>
      </Grid>
    </Card>
  ) : (
    <></>
  );
}
