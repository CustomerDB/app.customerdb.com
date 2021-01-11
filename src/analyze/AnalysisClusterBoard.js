import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import AspectRatioIcon from "@material-ui/icons/AspectRatio";
import Button from "react-bootstrap/Button";
import Card from "./Card.js";
import GetAppIcon from "@material-ui/icons/GetApp";
import Group from "./Group.js";
import HighlightModal from "./HighlightModal.js";
import { Loading } from "../util/Utils.js";
import RBush from "rbush";
import React from "react";
import colorPair from "../util/color.js";
import domToImage from "dom-to-image";
import event from "../analytics/event.js";
import { v4 as uuidv4 } from "uuid";

export default class AnalysisClusterBoard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loadedDocuments: false,
      loadedHighlights: false,
      loadedCards: false,
      loadedGroups: false,

      cardDragging: false,

      modalShow: false,
      modalData: undefined,

      documents: {},
      highlights: {},
      cards: {},
      groups: {},
    };

    this.rtree = new RBush(4);

    this.subscriptions = [];
    this.unsubscribeFromDocuments = () => {};
    this.unsubscribeFromHighlights = () => {};

    this.subscribeToDocuments = this.subscribeToDocuments.bind(this);
    this.subscribeToTranscriptHighlights = this.subscribeToTranscriptHighlights.bind(
      this
    );
    this.subscribeToNoteHighlights = this.subscribeToNoteHighlights.bind(this);

    this.setCardDragging = this.setCardDragging.bind(this);

    this.nextGroupName = this.nextGroupName.bind(this);

    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);
    this.addGroupLocation = this.addGroupLocation.bind(this);
    this.removeGroupLocation = this.removeGroupLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
    this.getIntersectingGroups = this.getIntersectingGroups.bind(this);

    this.printRTree = this.printRTree.bind(this);
    this.printRTreeItems = this.printRTreeItems.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);

    this.groupDataForCard = this.groupDataForCard.bind(this);
    this.updateHighlights = this.updateHighlights.bind(this);
  }

  setCardDragging(isCardDragging) {
    this.setState({ cardDragging: isCardDragging });
  }

  componentDidMount() {
    this.subscriptions.push(
      this.props.cardsRef.where("tagID", "==", this.props.tagID).onSnapshot(
        function (querySnapshot) {
          console.debug("received cards snapshot");

          let newCards = {};

          querySnapshot.forEach((doc) => {
            let newCard = doc.data();

            if (doc.id in this.state.cards) {
              let oldCard = this.state.cards[doc.id];
              if (
                oldCard.minX ||
                oldCard.minY ||
                oldCard.maxX ||
                oldCard.maxY
              ) {
                this.removeCardLocation(oldCard);
              }
            }

            if (newCard.minX || newCard.minY || newCard.maxX || newCard.maxY) {
              this.addCardLocation(newCard);
            }

            newCards[doc.id] = newCard;
          });

          this.setState({
            cards: newCards,
            loadedCards: true,
          });
        }.bind(this)
      )
    );

    this.subscriptions.push(
      this.props.groupsRef.onSnapshot(
        function (querySnapshot) {
          console.debug("received groups snapshot");

          var groups = this.state.groups;

          let snapshotGroupIDs = new Set();

          querySnapshot.forEach((doc) => {
            let data = doc.data();
            snapshotGroupIDs.add(doc.id);

            let existingGroup = groups[doc.id];
            if (existingGroup === undefined) {
              groups[doc.id] = data;
              return;
            }

            Object.assign(existingGroup, data);
          });

          Object.keys(this.state.groups).forEach((id) => {
            if (!snapshotGroupIDs.has(id)) {
              delete this.state.groups[id];
            }
          });

          this.setState({
            groups: groups,
            loadedGroups: true,
          });
        }.bind(this)
      )
    );

    this.subscribeToTranscriptHighlights();
    this.subscribeToNoteHighlights();

    this.subscribeToDocuments();
  }

  subscribeToDocuments() {
    this.unsubscribeFromDocuments = this.props.documentsRef.onSnapshot(
      (snapshot) => {
        console.debug("received documents snapshot");

        let newDocuments = {};

        snapshot.forEach((doc) => {
          let data = doc.data();

          console.debug("document", data);

          newDocuments[doc.id] = data;
        });

        this.setState({
          documents: newDocuments,
          loadedDocuments: true,
        });
      }
    );
  }

  // Called when either new transcript highlights or note highlights are received.
  updateHighlights() {
    if (!this.state.transcriptHighlights || !this.state.noteHighlights) {
      return;
    }

    // First make a copy of transcript highlights.
    let combinedHighlights = Object.assign({}, this.state.transcriptHighlights);
    // Then add note highlights.
    Object.assign(combinedHighlights, this.state.noteHighlights);

    this.setState({
      highlights: combinedHighlights,
      loadedHighlights: true,
    });
  }

  subscribeToTranscriptHighlights() {
    this.unsubscribeFromHighlights = this.props.transcriptHighlightsRef.onSnapshot(
      function (querySnapshot) {
        console.debug("received transcript highlights snapshot");

        var highlights = {};
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          highlights[data.ID] = data;

          // Each highlight should have a card
          let cardRef = this.props.cardsRef.doc(doc.id);
          cardRef.get().then((cardSnapshot) => {
            if (!cardSnapshot.exists) {
              cardRef.set({
                ID: doc.id,
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
                kind: "card",
                tagID: data.tagID,
                documentID: data.documentID,
                groupColor: "#000",
                textColor: "#FFF",
                source: "transcript",
              });
            }
          });
        });

        this.setState({
          transcriptHighlights: highlights,
        });

        // Delete cards without a matching highlight
        Object.keys(this.state.cards).forEach((cardID) => {
          if (this.state.cards[cardID].source !== "transcript") {
            return;
          }

          if (!(cardID in this.state.highlights)) {
            console.debug(
              "deleting card for nonexisting highlight with ID",
              cardID
            );
            this.props.cardsRef.doc(cardID).delete();
          }
        });

        this.updateHighlights();
      }.bind(this)
    );
  }

  subscribeToNoteHighlights() {
    this.unsubscribeFromHighlights = this.props.highlightsRef.onSnapshot(
      function (querySnapshot) {
        console.debug("received highlights snapshot");

        var highlights = {};
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          highlights[data.ID] = data;

          // Each highlight should have a card
          let cardRef = this.props.cardsRef.doc(doc.id);
          cardRef.get().then((cardSnapshot) => {
            if (!cardSnapshot.exists) {
              cardRef.set({
                ID: doc.id,
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
                kind: "card",
                tagID: data.tagID,
                documentID: data.documentID,
                groupColor: "#000",
                textColor: "#FFF",
                source: "notes",
              });
            }
          });
        });

        this.setState({
          noteHighlights: highlights,
        });

        // Delete cards without a matching highlight
        Object.keys(this.state.cards).forEach((cardID) => {
          if (this.state.cards[cardID].source !== "notes") {
            return;
          }

          if (!(cardID in this.state.highlights)) {
            console.debug(
              "deleting card for nonexisting highlight with ID",
              cardID
            );
            this.props.cardsRef.doc(cardID).delete();
          }
        });

        this.updateHighlights();
      }.bind(this)
    );
  }

  componentWillUnmount() {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribeFromHighlights();
    this.unsubscribeFromDocuments();
    this.setState({
      loadedDocuments: false,
      loadedHighlights: false,
      loadedCards: false,
      loadedGroups: false,
    });
  }

  addCardLocation(card) {
    console.debug(
      `addCardLocation (size@pre: ${this.rtree.all().length})`,
      card
    );
    this.rtree.insert(card);
    console.debug(
      `addCardLocation add (size@post: ${this.rtree.all().length})`
    );
  }

  removeCardLocation(card) {
    console.debug(
      `removeCardLocation (size@pre: ${this.rtree.all().length})`,
      card
    );
    this.rtree.remove(card, (a, b) => {
      // console.debug(`comparing\n${a.ID}\n${b.ID}`);
      return a.kind === "card" && b.kind === "card" && a.ID === b.ID;
    });
    console.debug(`removeCardLocation (size@post: ${this.rtree.all().length})`);
  }

  addGroupLocation(group) {
    console.debug(
      `addGroupLocation (size@pre: ${this.rtree.all().length})`,
      group
    );
    this.rtree.insert(group);
    console.debug(
      `addGroupLocation add (size@post: ${this.rtree.all().length})`
    );
  }

  removeGroupLocation(group) {
    console.debug(
      `removeGroupLocation (size@pre: ${this.rtree.all().length})`,
      group
    );
    this.rtree.remove(group, (a, b) => {
      // console.debug(`comparing\n${a.ID}\n${b.ID}`);
      return a.kind === "group" && b.kind === "group" && a.ID === b.ID;
    });
    console.debug(
      `removeGroupLocation (size@post: ${this.rtree.all().length})`
    );
  }

  printRTree(rect) {
    console.debug("RTree\n", this.rtree.toJSON());
  }

  printRTreeItems(rect) {
    console.debug("RTree items\n", this.rtree.all());
  }

  getIntersecting(rect) {
    return this.rtree.search(rect);
  }

  getIntersectingCards(rect) {
    return this.getIntersecting(rect).filter((item) => item.kind === "card");
  }

  getIntersectingGroups(rect) {
    return this.getIntersecting(rect).filter((item) => item.kind === "group");
  }

  nextGroupName(proposed) {
    let names = new Set();
    Object.values(this.state.groups).forEach((group) => {
      names.add(group.name);
    });
    if (!names.has(proposed)) return proposed;

    for (let i = 1; true; i++) {
      let newProposed = `${proposed} (${i})`;
      if (!names.has(newProposed)) return newProposed;
    }
  }

  groupDataForCard(card) {
    let undefinedGroupData = {
      ID: undefined,
      color: "#000",
      textColor: "#FFF",
    };

    let cardGroupIDs = new Set();
    let intersections = this.getIntersectingCards(card).filter((c) => {
      return c.ID !== card.ID;
    });

    console.debug("groupDataForCard (intersections):\n", intersections);

    // Case 1: The new card location does not intersect with any other card
    if (intersections.length === 0) {
      // If this card was previously part of a group, check whether we need
      // to delete that group (because it became empty or only has one other card)
      if (card.groupID !== undefined) {
        event(this.props.firebase, "remove_card_from_group", {
          orgID: this.props.orgID,
          userID: this.props.userID,
        });

        // Collect the cards (besides this one) that remain in this card's old group.
        let remainingCards = Object.values(this.state.cards).filter((item) => {
          return item.groupID === card.groupID && item.ID !== card.ID;
        });

        if (remainingCards.length < 2) {
          // Delete the group.
          console.debug("deleting group with ID", card.groupID);

          event(this.props.firebase, "delete_group", {
            orgID: this.props.orgID,
            userID: this.props.userID,
          });

          this.props.groupsRef.doc(card.groupID).delete();

          console.debug("remainingCards to clean up\n", remainingCards);

          remainingCards.forEach((cardToCleanUp) => {
            cardToCleanUp.groupColor = "#000";
            cardToCleanUp.textColor = "#FFF";
            delete cardToCleanUp["groupID"];
            this.props.cardsRef.doc(cardToCleanUp.ID).set(cardToCleanUp);
          });
        }
      }

      return undefinedGroupData;
    }

    intersections.forEach((obj) => {
      if (obj.groupID !== undefined) {
        cardGroupIDs.add(obj.groupID);
      }
    });

    // Case 2: The new card location intersects with one or more cards
    // all currently in the same existing group. Join this card to that.
    if (cardGroupIDs.size === 1) {
      let groupID = cardGroupIDs.values().next().value;

      if (card.groupID !== groupID) {
        event(this.props.firebase, "add_card_to_group", {
          orgID: this.props.orgID,
          userID: this.props.userID,
        });
      }

      let group = this.state.groups[groupID];
      if (group === undefined) {
        return undefinedGroupData;
      }
      return {
        ID: groupID,
        color: group.color,
        textColor: group.textColor,
      };
    }

    // Case 3: This card intersects with one or more cards, but none of
    // them are currently in a group. We need to create a new group
    // and join all the cards to it.
    if (cardGroupIDs.size === 0) {
      // Create a group.
      console.debug("Creating a group");

      event(this.props.firebase, "create_group", {
        orgID: this.props.orgID,
        userID: this.props.userID,
      });

      let groupID = uuidv4();
      let colors = colorPair();

      this.props.groupsRef.doc(groupID).set({
        kind: "group",
        ID: groupID,
        name: this.nextGroupName("Unnamed theme"),
        color: colors.background,
        textColor: colors.foreground,
      });

      intersections.forEach((c) => {
        c.groupID = groupID;
        c.groupColor = colors.background;
        c.textColor = colors.foreground;
        this.props.cardsRef.doc(c.ID).set(c);
      });
      this.setState({ cards: Object.assign({}, this.state.cards) });

      return {
        ID: groupID,
        color: colors.background,
        textColor: colors.foreground,
      };
    }

    // Case 4: This card intersects more than one group so we can't join any.
    return undefinedGroupData;
  }

  modalCallBack(card, highlight, document) {
    this.setState({
      modalShow: true,
      modalData: {
        card: card,
        highlight: highlight,
        document: document,
      },
    });
  }

  render() {
    // Use 4:3 aspect ratio
    const CANVAS_WIDTH = 12000;
    const CANVAS_HEIGHT = 8000;

    if (
      !this.state.loadedDocuments ||
      !this.state.loadedHighlights ||
      !this.state.loadedCards ||
      !this.state.loadedGroups ||
      Object.keys(this.state.highlights).length !==
        Object.keys(this.state.cards).length
    ) {
      console.debug("board state", this.state);
      return Loading();
    }

    const pxPerRem = 16;
    const cardWidthRems = 16;
    const cardHeightRems = 9;
    const cardSpaceRems = 2;
    const cardWidthPx = cardWidthRems * pxPerRem;
    const cardHeightPx = cardHeightRems * pxPerRem;
    const cardSpacePx = cardSpaceRems * pxPerRem;
    const cardLayoutWidthPx = cardSpacePx + cardWidthPx;
    const cardLayoutHeightPx = cardSpacePx + cardHeightPx;

    let cards = Object.values(this.state.cards);

    // lay out cards in diagonal grid order, like so:
    //
    // [0] [1] [3] [6] ...
    //
    // [2] [4] [7] ...
    //
    // [5] [8] ...
    //
    // [9] ...
    //
    // ...

    // Coordinates in the layout grid, as shown above
    let x = 0;
    let y = 0;
    let nextRowX = 1;

    cards.forEach((card) => {
      if (card.minX === 0 && card.maxX === 0) {
        card.minX = x * cardLayoutWidthPx;
        card.minY = y * cardLayoutHeightPx;
      }

      if (x === 0) {
        x = nextRowX;
        y = 0;
        nextRowX++;
        return;
      }

      x--;
      y++;
    });

    const countPeople = (objs) => {
      let personIDs = new Set();
      let representationFactor = 0;
      objs.forEach((o) => {
        if (personIDs.has(o.personID)) return;
        representationFactor++;
        if (!o.personID) return;
        personIDs.add(o.personID);
      });
      return representationFactor;
    };

    let totalPeople = countPeople(Object.values(this.state.documents));
    console.debug("totalPeople", totalPeople, this.state.documents);

    let groupComponents = Object.values(this.state.groups).map((group) => {
      let cards = Object.values(this.state.cards).filter((card) => {
        return card.groupID === group.ID;
      });
      let groupRef = this.props.groupsRef.doc(group.ID);

      let cardHighlights = cards.map((card) => this.state.highlights[card.ID]);
      let numPeople = countPeople(cardHighlights);

      return (
        <Group
          key={group.ID}
          name={group.name}
          group={group}
          cards={cards}
          renameGroupModalCallback={this.props.renameGroupModalCallback}
          numPeople={numPeople}
          totalPeople={totalPeople}
          groupRef={groupRef}
          addGroupLocationCallback={this.addGroupLocation}
          removeGroupLocationCallback={this.removeGroupLocation}
        />
      );
    });

    let pointers = undefined;
    // pointers = <Pointers activeUsersRef={this.props.activeUsersRef} />;

    let boardID = `board-${this.props.analysisID}-${this.props.tagID}`;

    return (
      <TransformWrapper
        options={{
          minScale: 0.5,
          maxScale: 2,
          limitToBounds: false,
          limitToWrapper: false,
          centerContent: false,
          disabled: this.state.cardDragging,
          zoomIn: {
            step: 10,
          },
          zoomOut: {
            step: 10,
          },
        }}
      >
        {({ resetTransform, scale }) => (
          <>
            <Button
              onClick={resetTransform}
              style={{
                color: "black",
                background: "#ddf",
                border: "0",
                borderRadius: "0.25rem",
                position: "absolute",
                top: "0rem",
                right: "0.25rem",
                opacity: 0.8,
                zIndex: 200,
              }}
            >
              <AspectRatioIcon />
            </Button>
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
                this.rtree.all().forEach((g) => {
                  console.log("adding geometry", g);
                  maxX = Math.max(maxX, g.maxX);
                  maxY = Math.max(maxY, g.maxY);
                });

                let groupLabels = domNode.getElementsByClassName("groupLabel");
                for (let i = 0; i < groupLabels.length; i++) {
                  let node = groupLabels[i];
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

                console.log("computed bounding box", maxX, maxY);

                domNode.style.width = `${maxX}px`;
                domNode.style.height = `${maxY}px`;

                domToImage
                  .toPng(domNode)
                  .then((dataURL) => {
                    domNode.style.width = `${CANVAS_WIDTH}px`;
                    domNode.style.height = `${CANVAS_HEIGHT}px`;
                    let link = document.createElement("a");
                    link.download = `CustomerDB (${this.props.analysisName}) - clusters-${this.props.tagID}.png`;
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
                    {groupComponents}
                    {cards.flatMap((card) => {
                      let highlight = this.state.highlights[card.ID];
                      if (!highlight) return [];

                      let doc = this.state.documents[highlight.documentID];
                      if (!doc) return <></>;

                      return [
                        <Card
                          key={card.ID}
                          scale={scale}
                          card={card}
                          highlight={highlight}
                          document={doc}
                          minX={card.minX}
                          minY={card.minY}
                          groupColor={card.groupColor}
                          textColor={card.textColor}
                          cardRef={this.props.cardsRef.doc(card.ID)}
                          modalCallBack={this.modalCallBack}
                          addLocationCallBack={this.addCardLocation}
                          removeLocationCallBack={this.removeCardLocation}
                          getIntersectingCardsCallBack={
                            this.getIntersectingCards
                          }
                          getIntersectingGroupsCallBack={
                            this.getIntersectingGroups
                          }
                          groupDataForCardCallback={this.groupDataForCard}
                          setCardDragging={this.setCardDragging}
                        />,
                      ];
                    })}
                    {pointers}
                    <HighlightModal
                      show={this.state.modalShow}
                      data={this.state.modalData}
                      onHide={() => this.setState({ modalShow: false })}
                    />
                  </div>
                </div>
              </TransformComponent>
            </div>
          </>
        )}
      </TransformWrapper>
    );
  }
}
