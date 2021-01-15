import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import Card from "./Card.js";
import Theme, { computeThemeBounds } from "./Theme.js";
import RBush from "rbush";
import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import colorPair from "../util/color.js";
import event from "../analytics/event.js";
import { v4 as uuidv4 } from "uuid";
import UserAuthContext from "../auth/UserAuthContext.js";
import FirebaseContext from "../util/FirebaseContext.js";
import { useParams, useNavigate } from "react-router-dom";
import useFirestore from "../db/Firestore.js";
import { Loading } from "../util/Utils.js";
import Grid from "@material-ui/core/Grid";
import domToImage from "dom-to-image";
import * as firebaseClient from "firebase/app";

export default function BoardCanvas({
  board,
  setSidepaneOpen,
  setSidepaneHighlight,
  setSidepaneTheme,
  download,
}) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  const [cards, setCards] = useState([]);
  const [themes, setThemes] = useState([]);

  const { cardsRef, themesRef } = useFirestore();

  const { orgID } = useParams();

  const [cardDragging, setCardDragging] = useState(false);

  const rtree = useRef(new RBush(4));

  const navigate = useNavigate();

  // Use 4:3 aspect ratio
  const CANVAS_WIDTH = 12000;
  const CANVAS_HEIGHT = 8000;
  const VIEWPORT_WIDTH = 1500;
  const VIEWPORT_HEIGHT = 800;
  let boardID = `board-${board.ID}`;

  const downloadBoard = useCallback(() => {
    if (!document || !board) {
      return;
    }

    let domNode = document.getElementById(boardID);
    if (!domNode) {
      console.warn(`Domnode not found for ${boardID}`);
      return;
    }

    let minX = CANVAS_WIDTH;
    let minY = CANVAS_HEIGHT;
    let maxX = 0;
    let maxY = 0;
    rtree.current.all().forEach((g) => {
      minX = Math.min(minX, g.minX);
      minY = Math.min(minY, g.minY);
      maxX = Math.max(maxX, g.maxX);
      maxY = Math.max(maxY, g.maxY);
    });

    let themesLabels = domNode.getElementsByClassName("themesLabel");
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
    minX -= 64;
    minY -= 64;

    // Clamp to canvas bounds
    maxX = Math.min(maxX, CANVAS_WIDTH);
    maxY = Math.min(maxY, CANVAS_HEIGHT);

    console.log(`minX ${minX} minY ${minY} maxX ${maxX} maxY ${maxY}`);

    let containerNode = document.getElementById(`${boardID}-container`);
    if (!containerNode) {
      console.warn(`containerNode not found for ${containerNode}`);
      return;
    }

    containerNode.style.position = "relative";
    domNode.style.position = "absolute";
    domNode.style.top = `${-minY}px`;
    domNode.style.left = `${-minX}px`;
    containerNode.style.width = `${maxX - minX}px`;
    containerNode.style.height = `${maxY - minY}px`;
    domNode.style.width = `${maxX - minX}px`;
    domNode.style.height = `${maxY - minY}px`;
    containerNode.style.overflow = "hidden";
    containerNode.style.boxShadow = "";

    const resetStyle = () => {
      domNode.style.width = `${CANVAS_WIDTH}px`;
      domNode.style.height = `${CANVAS_HEIGHT}px`;
      domNode.style.position = "";
      domNode.style.top = "";
      domNode.style.left = "";
      containerNode.style.position = "";
      containerNode.style.width = `${CANVAS_WIDTH}px`;
      containerNode.style.height = `${CANVAS_HEIGHT}px`;
      containerNode.style.boxShadow = "0 6px 6px rgba(0, 0, 0, 0.2)";
    };

    domToImage
      .toPng(containerNode)
      .then((dataURL) => {
        resetStyle();
        let link = document.createElement("a");
        link.download = `CustomerDB - ${board.name}.png`;
        link.href = dataURL;
        link.click();
        navigate(`/orgs/${orgID}/boards/${board.ID}`);
      })
      .catch((error) => {
        resetStyle();
        throw error;
      });
  }, [document, board]);

  const addCardLocation = (card) => {
    rtree.current.insert(card);
  };

  const removeCardLocation = (card) => {
    rtree.current.remove(card, (a, b) => {
      return a.kind === "card" && b.kind === "card" && a.ID === b.ID;
    });
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

      event(firebase, "create_theme", {
        orgID: orgID,
        userID: oauthClaims.user_id,
      });

      let themeID = uuidv4();
      let colors = colorPair();

      let theme = {
        kind: "theme",
        ID: themeID,
        organizationID: orgID,
        name: nextThemeName("Unnamed theme"),
        color: colors.background,
        textColor: colors.foreground,
        lastUpdatedTimestamp: firebaseClient.firestore.FieldValue.serverTimestamp(),
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

  useEffect(() => {
    if (!download) {
      return;
    }
    downloadBoard();
  }, [download]);

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
          {({ scale }) => (
            <>
              <div
                className="scrollContainer"
                style={{ overflow: "hidden", background: "#e9e9e9" }}
              >
                <TransformComponent>
                  <div
                    id={`${boardID}-container`}
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
