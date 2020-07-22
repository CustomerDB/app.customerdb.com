import React from "react";
import RBush from "rbush";
import { nanoid } from "nanoid";

import Card from "./Card.js";
import Group from "./Group.js";
import Pointers from "./Pointers.js";
import HighlightModal from "./HighlightModal.js";
import colorPair from "./color.js";
import { Loading } from "./Utils.js";

export default class DatasetClusterBoard extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loadedDocuments: false,
      loadedHighlights: false,
      loadedCards: false,
      loadedGroups: false,

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
    this.subscribeToHighlights = this.subscribeToHighlights.bind(this);

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
  }

  componentDidMount() {
    this.subscriptions.push(
      this.props.cardsRef.onSnapshot(
        function (querySnapshot) {
          console.debug("received cards snapshot");

          let newCards = {};

          querySnapshot.forEach((doc) => {
            let data = doc.data();
            newCards[doc.id] = data;
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

    this.subscribeToHighlights();

    this.subscribeToDocuments();
  }

  subscribeToDocuments() {
    this.unsubscribeFromDocuments = this.props.documentsRef.onSnapshot(
      (snapshot) => {
        console.log("received documents snapshot");

        let newDocuments = {};

        snapshot.forEach((doc) => {
          let data = doc.data();

          console.log("document", data);

          newDocuments[doc.id] = data;
        });

        this.setState({
          documents: newDocuments,
          loadedDocuments: true,
        });
      }
    );
  }

  subscribeToHighlights() {
    this.unsubscribeFromHighlights = this.props.highlightsRef.onSnapshot(
      function (querySnapshot) {
        console.debug("received highlights snapshot");

        var highlights = {};
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          highlights[data.ID] = data;

          let cardData = Object.assign(data, {});
          cardData.groupColor = "#000";
          cardData.textColor = "#FFF";

          // Each highlight should have a card
          let cardRef = this.props.cardsRef.doc(cardData.ID);
          cardRef.get().then((cardSnapshot) => {
            if (!cardSnapshot.exists) {
              cardRef.set({
                ID: doc.id,
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
                kind: "card",
                documentID: data.documentID,
              });
            }
          });
        });

        this.setState({
          highlights: highlights,
          loadedHighlights: true,
        });

        // Delete cards without a matching highlight
        Object.keys(this.state.cards).forEach((cardID) => {
          if (!(cardID in this.state.highlights)) {
            console.log(
              "deleting card for nonexisting highlight with ID",
              cardID
            );
            this.props.cardsRef.doc(cardID).delete();
          }
        });
      }.bind(this)
    );
  }

  componentDidUpdate(oldProps) {
    console.log("componentDidUpdate", oldProps, this.props);

    let hasNewHighlightsRef =
      oldProps.highlightsRef !== this.props.highlightsRef;
    console.log("highlightsRef is new?", hasNewHighlightsRef);

    if (hasNewHighlightsRef) {
      this.unsubscribeFromHighlights();
      this.subscribeToHighlights();
    }

    let hasNewDocumentsRef = oldProps.documentsRef !== this.props.documentsRef;
    console.log("documentsRef is new?", hasNewDocumentsRef);

    if (hasNewDocumentsRef) {
      this.unsubscribeFromDocuments();
      this.subscribeToDocuments();
    }
  }

  componentWillUnmount() {
    this.subscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribeFromHighlights();
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
    console.log(
      `removeCardLocation (size@pre: ${this.rtree.all().length})`,
      card
    );
    this.rtree.remove(card, (a, b) => {
      console.debug(`comparing\n${a.ID}\n${b.ID}`);
      return a.kind === "card" && b.kind === "card" && a.ID === b.ID;
    });
    console.log(`removeCardLocation (size@post: ${this.rtree.all().length})`);
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
      console.debug(`comparing\n${a.ID}\n${b.ID}`);
      return a.kind === "group" && b.kind === "group" && a.ID === b.ID;
    });
    console.debug(
      `removeGroupLocation (size@post: ${this.rtree.all().length})`
    );
  }

  printRTree(rect) {
    console.log("RTree\n", this.rtree.toJSON());
  }

  printRTreeItems(rect) {
    console.log("RTree items\n", this.rtree.all());
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

    console.log("groupDataForCard (intersections):\n", intersections);

    // Case 1: The new card location does not intersect with any other card
    if (intersections.length === 0) {
      // If this card was previously part of a group, check whether we need
      // to delete that group (because it became empty or only has one other card)
      if (card.groupID !== undefined) {
        // Collect the cards (besides this one) that remain in this card's old group.
        let remainingCards = Object.values(this.state.cards).filter((item) => {
          return item.groupID === card.groupID && item.ID !== card.ID;
        });

        if (remainingCards.length < 2) {
          // Delete the group.
          this.props.groupsRef.doc(card.groupID).delete();

          console.log("remainingCards to clean up\n", remainingCards);

          remainingCards.forEach((cardToCleanUP) => {
            cardToCleanUP.groupColor = "#000";
            cardToCleanUP.textColor = "#FFF";
            delete cardToCleanUP["groupID"];
            this.props.cardsRef.doc(cardToCleanUP.ID).set(cardToCleanUP);
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
      console.log("Creating a group");
      let groupID = nanoid();
      let colors = colorPair();
      this.props.groupsRef.doc(groupID).set({
        kind: "group",
        ID: groupID,
        name: "Unnamed group",
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
    if (
      !this.state.loadedDocuments ||
      !this.state.loadedHighlights ||
      !this.state.loadedCards ||
      !this.state.loadedGroups ||
      Object.keys(this.state.highlights).length !==
        Object.keys(this.state.cards).length
    ) {
      console.log("board state", this.state);
      return Loading();
    }

    let cardComponents = [];
    let cardTitles = new Set();
    let cards = Object.values(this.state.cards);
    for (let i = 0; i < cards.length; i++) {
      let card = cards[i];
      if (card.minX === 0 && card.maxX === 0) {
        card.minX = 0 + i * 20;
        card.minY = 50 + i * 20;
      }

      let highlight = this.state.highlights[card.ID];
      cardTitles.add(highlight.documentID);

      cardComponents.push(
        <Card
          key={card.ID}
          card={card}
          highlight={highlight}
          document={this.state.documents[highlight.documentID]}
          minX={card.minX}
          minY={card.minY}
          groupColor={card.groupColor}
          textColor={card.textColor}
          cardRef={this.props.cardsRef.doc(card.ID)}
          modalCallBack={this.modalCallBack}
          addLocationCallBack={this.addCardLocation}
          removeLocationCallBack={this.removeCardLocation}
          getIntersectingCardsCallBack={this.getIntersectingCards}
          getIntersectingGroupsCallBack={this.getIntersectingGroups}
          groupDataForCardCallback={this.groupDataForCard}
        />
      );
    }

    let groupComponents = Object.values(this.state.groups).map((group) => {
      let cards = Object.values(this.state.cards).filter((card) => {
        return card.groupID === group.ID;
      });
      let groupRef = this.props.groupsRef.doc(group.ID);
      return (
        <Group
          key={group.ID}
          name={group.name}
          group={group}
          cards={cards}
          totalCardCount={cardTitles.size}
          groupRef={groupRef}
          addGroupLocationCallback={this.addGroupLocation}
          removeGroupLocationCallback={this.removeGroupLocation}
        />
      );
    });

    let pointers = undefined;
    // pointers = <Pointers activeUsersRef={this.props.activeUsersRef} />;

    return (
      <>
        {groupComponents}
        {cardComponents}
        {pointers}
        <HighlightModal
          show={this.state.modalShow}
          data={this.state.modalData}
          onHide={() => this.setState({ modalShow: false })}
        />
      </>
    );
  }
}
