import React, { useState, useEffect } from "react";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import useFirestore from "../db/Firestore.js";
import Quote from "./Quote";
import Scrollable from "../shell/Scrollable.js";
import * as firebaseClient from "firebase/app";
import EditableTitle from "../util/EditableTitle";

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

export default function ThemeSidepane({ theme, setTheme }) {
  const { themesRef } = useFirestore();

  // Subscribe to theme document, as we may not receive an updated theme
  // once cards makes it into it's cardIDs collection.
  const [themeDocument, setThemeDocument] = useState();
  const [cardIDs, setCardIDs] = useState([]);

  useEffect(() => {
    if (!theme || !themesRef) {
      return;
    }

    return themesRef.doc(theme.ID).onSnapshot((doc) => {
      if (!doc.exists) {
        setTheme();
        return;
      }

      setThemeDocument(doc.data());
    });
  }, [theme, themesRef, setTheme]);

  useEffect(() => {
    if (!theme || !themeDocument) {
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
  }, [themeDocument, themesRef, theme]);

  if (!theme || !themeDocument) {
    return <></>;
  }

  return (
    <Grid
      container
      style={{ flexGrow: 1 }}
      alignItems="baseline"
      direction="column"
    >
      <Grid container item style={{ paddingLeft: "2rem" }}>
        <Typography variant="h6" style={{ fontWeight: "bold" }}>
          <EditableTitle
            value={themeDocument.name}
            onSave={(name) => {
              let themeRef = themesRef.doc(theme.ID);
              if (themeRef) {
                let newName = name
                  .replace(/(\r\n|\n|\r)/gm, " ")
                  .replace(/\s+/g, " ")
                  .trim();

                if (newName === "") {
                  // Ignore empty name - otherwise, a user won't be able to rename the theme.
                  newName = "Unnamed theme";
                }

                console.log("newName", newName);

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
          <EditableTitle
            value={
              themeDocument.description
                ? themeDocument.description
                : "Description"
            }
            onSave={(name) => {
              let themeRef = themesRef.doc(theme.ID);
              if (themeRef) {
                let newDescription = name
                  .replace(/(\r\n|\n|\r)/gm, " ")
                  .replace(/\s+/g, " ")
                  .trim();

                return themeRef.update({
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
