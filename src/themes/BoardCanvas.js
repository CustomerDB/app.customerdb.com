import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import AspectRatioIcon from "@material-ui/icons/AspectRatio";
import Button from "react-bootstrap/Button";
import Card from "./Card.js";
import GetAppIcon from "@material-ui/icons/GetApp";
import Theme, { computeThemeBounds } from "./Theme.js";
import RBush from "rbush";
import React, { useState, useEffect, useRef, useContext } from "react";
import colorPair from "../util/color.js";
import domToImage from "dom-to-image";
import event from "../analytics/event.js";
import { v4 as uuidv4 } from "uuid";
import UserAuthContext from "../auth/UserAuthContext.js";
import FirebaseContext from "../util/FirebaseContext.js";
import { useParams } from "react-router-dom";
import useFirestore from "../db/Firestore.js";
import { Loading } from "../util/Utils.js";
import Grid from "@material-ui/core/Grid";

export default function BoardCanvas({
  board,
  setSidepaneOpen,
  setSidepaneHighlight,
  setSidepaneTheme,
}) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  const [cards, setCards] = useState([]);
  const [themes, setThemes] = useState([]);

  const { cardsRef, themesRef } = useFirestore();

  const { orgID } = useParams();

  const [cardDragging, setCardDragging] = useState(false);

  const rtree = useRef(new RBush(4));

  const addCardLocation = (card) => {
    console.debug(
      `addCardLocation (size@pre: ${rtree.current.all().length})`,
      card
    );
    rtree.current.insert(card);
    console.debug(
      `addCardLocation add (size@post: ${rtree.current.all().length})`
    );
  };

  const removeCardLocation = (card) => {
    console.debug(
      `removeCardLocation (size@pre: ${rtree.current.all().length})`,
      card
    );
    rtree.current.remove(card, (a, b) => {
      return a.kind === "card" && b.kind === "card" && a.ID === b.ID;
    });
    console.debug(
      `removeCardLocation (size@post: ${rtree.current.all().length})`
    );
  };

  const addThemeLocation = (theme) => {
    rtree.current.insert(theme);
  };

  const removeThemeLocation = (themes) => {
    rtree.current.remove(themes, (a, b) => {
      return a.kind === "theme" && b.kind === "theme" && a.ID === b.ID;
    });
  };

  const getIntersecting = (rect) => {
    return rtree.current.search(rect);
  };

  const getIntersectingCards = (rect) => {
    return getIntersecting(rect).filter((item) => item.kind === "card");
  };

  const getIntersectingThemes = (rect) => {
    return getIntersecting(rect).filter((item) => item.kind === "theme");
  };

  const nextThemeName = (proposed) => {
    let names = new Set();
    themes.forEach((theme) => {
      names.add(theme.name);
    });
    if (!names.has(proposed)) return proposed;

    for (let i = 1; true; i++) {
      let newProposed = `${proposed} (${i})`;
      if (!names.has(newProposed)) return newProposed;
    }
  };

  const themeDataForCard = (card) => {
    let undefinedThemeData = {
      ID: undefined,
      color: "#000",
      textColor: "#FFF",
    };

    let cardthemeIDs = new Set();
    let intersections = getIntersectingCards(card).filter((c) => {
      return c.ID !== card.ID;
    });

    console.debug("themeDataForCard (intersections):\n", intersections);

    // Case 1: The new card location does not intersect with any other card
    if (intersections.length === 0) {
      // If this card was previously part of a theme, check whether we need
      // to delete that theme (because it became empty or only has one other card)
      if (card.themeID !== undefined) {
        // Collect the cards (besides this one) that remain in this card's old theme.
        let remainingCards = cards.filter((item) => {
          return item.themeID === card.themeID && item.ID !== card.ID;
        });

        if (remainingCards.length < 2 && card.themeID) {
          // Delete the theme.
          remainingCards.forEach((cardToCleanUp) => {
            cardToCleanUp.themesColor = "#000";
            cardToCleanUp.textColor = "#FFF";
            delete cardToCleanUp["themeID"];
            cardsRef.doc(cardToCleanUp.ID).set(cardToCleanUp);
          });
        }
      }

      return undefinedThemeData;
    }

    intersections.forEach((obj) => {
      if (obj.themeID !== undefined && obj.themeID !== "") {
        cardthemeIDs.add(obj.themeID);
      }
    });

    // Case 2: The new card location intersects with one or more cards
    // all currently in the same existing theme. Join this card to that.
    if (cardthemeIDs.size === 1) {
      let themeID = cardthemeIDs.values().next().value;

      if (card.themeID !== themeID) {
        event(firebase, "add_card_to_theme", {
          orgID: orgID,
          userID: oauthClaims.user_id,
        });
      }

      let theme = themes.find((theme) => theme.ID == themeID);
      if (theme === undefined) {
        return undefinedThemeData;
      }
      return {
        ID: themeID,
        color: theme.color,
        textColor: theme.textColor,
      };
    }

    // Case 3: This card intersects with one or more cards, but none of
    // them are currently in a theme. We need to create a new theme
    // and join all the cards to it.
    if (cardthemeIDs.size === 0) {
      // Create a theme.
      console.debug("Creating a theme");

      event(firebase, "create_themes", {
        orgID: orgID,
        userID: oauthClaims.user_id,
      });

      let themeID = uuidv4();
      let colors = colorPair();

      let theme = {
        kind: "theme",
        ID: themeID,
        name: nextThemeName("Unnamed theme"),
        color: colors.background,
        textColor: colors.foreground,
      };
      themesRef.doc(themeID).set(theme);

      intersections.forEach((c) => {
        c.themeID = themeID;
        c.themeColor = colors.background;
        c.textColor = colors.foreground;
        cardsRef.doc(c.ID).set(c);
      });

      console.log("Setting theme: ", theme);
      setSidepaneTheme(theme);

      return {
        ID: themeID,
        color: colors.background,
        textColor: colors.foreground,
      };
    }

    // Case 4: This card intersects more than one themes so we can't join any.
    return undefinedThemeData;
  };

  useEffect(() => {
    if (!cardsRef) {
      return;
    }

    return cardsRef.onSnapshot((snapshot) => {
      let newCards = [];
      snapshot.forEach((doc) => {
        let newCard = doc.data();
        newCards.push(newCard);
      });
      setCards(newCards);
    });
  }, [cardsRef]);

  useEffect(() => {
    if (!themesRef) {
      return;
    }

    return themesRef.onSnapshot((snapshot) => {
      let newthemes = [];
      snapshot.forEach((doc) => {
        newthemes.push(doc.data());
      });
      setThemes(newthemes);
    });
  }, [themesRef]);

  useEffect(() => {
    rtree.current.clear();
    cards.forEach((card) => addCardLocation(card));
    themes.forEach((themes) => {
      let memberCards = cards.filter((card) => card.themeID === themes.ID);

      // NOTE: rtree becomes unuable if we add records without geometry.
      //       So we have to make sure a themes has cards before adding it.
      if (memberCards.length < 2) {
        return;
      }
      let newthemes = computeThemeBounds(memberCards);
      Object.assign(newthemes, themes);
      addThemeLocation(newthemes);
    });
  }, [cards, themes]);

  if (!cardsRef || !themesRef) {
    return <Loading />;
  }

  if (!board.documentIDs || board.documentIDs.length === 0) {
    setSidepaneOpen(true);
    return <></>;
  }

  if (!cards) {
    return <></>;
  }

  // Use 4:3 aspect ratio
  const CANVAS_WIDTH = 12000;
  const CANVAS_HEIGHT = 8000;
  const VIEWPORT_WIDTH = 1500;
  const VIEWPORT_HEIGHT = 800;

  let themesComponents = themes.map((theme) => {
    let newCards = cards.filter((card) => {
      return card.themeID === theme.ID;
    });

    return (
      <Theme
        key={theme.ID}
        name={theme.name}
        theme={themes.find((t) => theme.ID == t.ID)}
        cards={newCards}
        themesRef={themesRef.doc(theme.ID)}
        addThemeLocationCallback={addThemeLocation}
        removeThemeLocationCallback={removeThemeLocation}
        setSidepaneTheme={setSidepaneTheme}
      />
    );
  });

  let boardID = `board-${board.ID}`;

  let defaultCanvasX = -(CANVAS_WIDTH / 2 - VIEWPORT_WIDTH / 2);
  let defaultCanvasY = -(CANVAS_HEIGHT / 2 - VIEWPORT_HEIGHT / 2);

  return (
    <Grid
      container
      item
      xs={12}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div style={{ position: "relative", width: "100%", flexGrow: 1 }}>
        <TransformWrapper
          defaultPositionX={defaultCanvasX}
          defaultPositionY={defaultCanvasY}
          options={{
            minScale: 0.1,
            maxScale: 2,
            limitToBounds: false,
            limitToWrapper: false,
            centerContent: false,
            disabled: cardDragging,
            zoomIn: {
              step: 10,
            },
            zoomOut: {
              step: 10,
            },
          }}
        >
          {({ setPositionX, setPositionY, scale }) => (
            <>
              <Button
                title="Download board image"
                style={{
                  color: "black",
                  background: "#ddf",
                  border: "0",
                  borderRadius: "0.25rem",
                  position: "absolute",
                  top: "2rem",
                  right: "0.25rem",
                  opacity: 0.8,
                  zIndex: 200,
                }}
                variant="light"
                onClick={() => {
                  let domNode = document.getElementById(boardID);

                  let maxX = 0;
                  let maxY = 0;
                  rtree.current.all().forEach((g) => {
                    console.debug("adding geometry", g);
                    maxX = Math.max(maxX, g.maxX);
                    maxY = Math.max(maxY, g.maxY);
                  });

                  let themesLabels = domNode.getElementsByClassName(
                    "themesLabel"
                  );
                  for (let i = 0; i < themesLabels.length; i++) {
                    let node = themesLabels[i];
                    maxX = Math.max(
                      maxX,
                      parseInt(node.style.left) + parseInt(node.style.width)
                    );
                    maxY = Math.max(maxY, parseInt(node.style.top) + 128);
                  }

                  // A little extra padding
                  maxX += 64;
                  maxY += 64;

                  // Clamp to canvas bounds
                  maxX = Math.min(maxX, CANVAS_WIDTH);
                  maxY = Math.min(maxY, CANVAS_HEIGHT);

                  console.debug("computed bounding box", maxX, maxY);

                  domNode.style.width = `${maxX}px`;
                  domNode.style.height = `${maxY}px`;

                  domToImage
                    .toPng(domNode)
                    .then((dataURL) => {
                      domNode.style.width = `${CANVAS_WIDTH}px`;
                      domNode.style.height = `${CANVAS_HEIGHT}px`;
                      let link = document.createElement("a");
                      link.download = `CustomerDB - ${board.name}.png`;
                      link.href = dataURL;
                      link.click();
                    })
                    .catch((error) => {
                      domNode.style.width = `${CANVAS_WIDTH}px`;
                      domNode.style.height = `${CANVAS_HEIGHT}px`;
                      throw error;
                    });
                }}
              >
                <GetAppIcon />
              </Button>
              <div
                className="scrollContainer"
                style={{ overflow: "hidden", background: "#e9e9e9" }}
              >
                <TransformComponent>
                  <div
                    style={{
                      width: `${CANVAS_WIDTH}px`,
                      height: `${CANVAS_HEIGHT}px`,
                      background: "white",
                      boxShadow: "0 6px 6px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div
                      id={boardID}
                      style={{
                        width: `${CANVAS_WIDTH}px`,
                        height: `${CANVAS_HEIGHT}px`,
                      }}
                    >
                      {themesComponents}
                      {cards.flatMap((card) => {
                        if (!card.ID) {
                          return [];
                        }

                        return [
                          <Card
                            key={card.ID}
                            scale={scale}
                            card={card}
                            themesColor={card.themesColor}
                            textColor={card.textColor}
                            cardRef={cardsRef.doc(card.ID)}
                            addLocationCallBack={addCardLocation}
                            removeLocationCallBack={removeCardLocation}
                            getIntersectingCardsCallBack={getIntersectingCards}
                            getIntersectingThemesCallBack={
                              getIntersectingThemes
                            }
                            themeDataForCardCallback={themeDataForCard}
                            setCardDragging={setCardDragging}
                            cardDragging={cardDragging}
                            setSidepaneHighlight={setSidepaneHighlight}
                          />,
                        ];
                      })}
                    </div>
                  </div>
                </TransformComponent>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
    </Grid>
  );
}
