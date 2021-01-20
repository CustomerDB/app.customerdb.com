import React, { useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import useFirestore from "../db/Firestore.js";
import Moment from "react-moment";
import QuotePreview from "../quotes/QuotePreview.js";

export default function ThemePreview({ boardID, themeID, hideNotFound }) {
  const { boardsRef } = useFirestore();
  const [theme, setTheme] = useState();
  const [cardIDs, setCardIDs] = useState();

  useEffect(() => {
    if (!boardID || !themeID || !boardsRef) return;

    const themeRef = boardsRef.doc(boardID).collection("themes").doc(themeID);

    return themeRef.onSnapshot((doc) => {
      setTheme(doc.data());
    });
  }, [boardID, themeID, boardsRef]);

  useEffect(() => {
    if (!boardID || !themeID || !boardsRef) return;

    const cardsRef = boardsRef
      .doc(boardID)
      .collection("themes")
      .doc(themeID)
      .collection("cardIDs");

    return cardsRef.onSnapshot((snapshot) => {
      setCardIDs(snapshot.docs.map((doc) => doc.id));
    });
  }, [boardID, themeID, boardsRef]);

  if (!theme) {
    return (
      <Card
        key={themeID}
        style={{
          width: "100%",
          margin: "0.5rem",
          borderRadius: "0.5rem",
          backgroundColor: "#fafafa",
        }}
      >
        <CircularProgress/>
      </Card>
    );
  }

  let creationTimestamp = theme.creationTimestamp.toDate();

  return (
    <Card
      key={themeID}
      style={{
        width: "100%",
        margin: "0.5rem",
        borderRadius: "0.5rem",
        backgroundColor: "#fafafa",
      }}
    >
      <CardContent>
        <p style={{ display: "inline" }}>
          <b>{theme.name}</b>
          <br />
          <em>
            <Moment fromNow date={creationTimestamp} />
          </em>
        </p>
        {cardIDs && (
          <Grid container item xs>
            {cardIDs.map((cardID) => {
              return (
                <QuotePreview key={cardID} highlightID={cardID} hideNotFound />
              );
            })}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
}
