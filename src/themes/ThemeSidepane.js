import React, { useState, useEffect } from "react";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import useFirestore from "../db/Firestore.js";
import Quote from "./Quote";
import Scrollable from "../shell/Scrollable.js";
import ContentEditable from "react-contenteditable";
import * as firebaseClient from "firebase/app";

function Card({ cardID }) {
  // Look up highlight hit for card.
  const [cache, setCache] = useState();
  const { cardsRef } = useFirestore();

  useEffect(() => {
    if (!cardID || !cardsRef) {
      return;
    }

    return cardsRef.doc(cardID).onSnapshot((doc) => {
      let card = doc.data();

      if (card.highlightHitCache) {
        setCache(card.highlightHitCache);
      }
    });
  }, [cardID, cardsRef]);

  if (!cache) {
    return <></>;
  }

  return <Quote highlight={cache} />;
}

export default function ThemeSidepane({ theme }) {
  const { cardsRef, themesRef } = useFirestore();

  // Subscribe to theme document, as we may not receive an updated theme
  // once cards makes it into it's cardIDs collection.
  const [themeDocument, setThemeDocument] = useState();
  const [cardIDs, setCardIDs] = useState([]);

  useEffect(() => {
    if (!theme) {
      return;
    }

    return themesRef.doc(theme.ID).onSnapshot((doc) => {
      if (!doc.exists) {
        return;
      }

      setThemeDocument(doc.data());
    });
  }, [theme]);

  useEffect(() => {
    if (!themeDocument) {
      return;
    }

    return themesRef
      .doc(theme.ID)
      .collection("cardIDs")
      .onSnapshot((snapshot) => {
        let newCardIDs = [];
        snapshot.forEach((doc) => {
          newCardIDs.push(doc.data()["ID"]);
        });
        setCardIDs(newCardIDs);
      });
  }, [themeDocument]);

  if (!theme || !themeDocument) {
    return <></>;
  }

  console.log("themeDocument", themeDocument);

  const enterToBlur = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  return (
    <Grid
      container
      style={{ flexGrow: 1 }}
      alignItems="baseline"
      direction="column"
    >
      <Grid container item style={{ paddingLeft: "2rem" }}>
        <Typography variant="h6" style={{ fontWeight: "bold" }}>
          <ContentEditable
            html={themeDocument.name}
            onKeyDown={enterToBlur}
            onBlur={(e) => {
              let themeRef = themesRef.doc(theme.ID);
              if (themeRef) {
                let newName = e.target.innerText
                  .replace(/(\r\n|\n|\r)/gm, " ")
                  .replace(/\s+/g, " ")
                  .trim();

                themeRef.update({
                  name: newName,
                  lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
                });
              }
            }}
          />
        </Typography>
      </Grid>
      <Grid
        container
        item
        style={{ paddingLeft: "2rem", paddingBottom: "1rem" }}
      >
        <Typography variant="subtitle2" gutterBottom>
          <ContentEditable
            html={
              themeDocument.description
                ? themeDocument.description
                : "Description"
            }
            onKeyDown={enterToBlur}
            onBlur={(e) => {
              let themeRef = themesRef.doc(theme.ID);
              if (themeRef) {
                let newDescription = e.target.innerText
                  .replace(/(\r\n|\n|\r)/gm, " ")
                  .replace(/\s+/g, " ")
                  .trim();

                themeRef.update({
                  description: newDescription,
                  lastUpdateTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
                });
              }
            }}
          />
        </Typography>
      </Grid>
      <Grid
        container
        item
        style={{
          flexGrow: 1,
          backgroundColor: "#f9f9f9",
          position: "relative",
        }}
      >
        <Scrollable>
          {cardIDs.map((cardID) => (
            <Card cardID={cardID} />
          ))}
        </Scrollable>
      </Grid>
    </Grid>
  );
}
