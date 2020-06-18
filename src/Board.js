import React from 'react';
import RBush from 'rbush';
import { HotKeys } from 'react-hotkeys';
import { v4 as uuidv4 } from 'uuid';

import Card from './Card.js';
import Group from './Group.js';
import HighlightModal from './HighlightModal.js';
import colorPair from './color.js';
import { Loading } from './Utils.js';

export default class Board extends React.Component {
  constructor(props) {
    super(props);
    this.tag = props.tag;

    this.datasetRef = props.datasetRef;

    this.boardRef = props.boardRef;
    this.cardsRef = this.boardRef.collection('cards');
    this.groupsRef = this.boardRef.collection('groups');

    this.state = {
      loadedHighlights: false,
      loadedCards: false,

      highlights: [],
      modalShow: false,
      modalHighlight: undefined,
      modalCard: undefined,
      modalRect: undefined,

      cards: {},
      groups: {}
    }

    this.rtree = new RBush(4);

    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
    this.printRTree = this.printRTree.bind(this);
    this.printRTreeItems = this.printRTreeItems.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);

    this.groupDataForCard = this.groupDataForCard.bind(this);
  }

  componentDidMount() {
    this.cardsRef.onSnapshot(
      (
        function(querySnapshot) {
          console.log("received boards/{id}/cards snapshot");

          var cards = this.state.cards;

          querySnapshot.forEach((doc) => {
            let data = doc.data();

            let existingCard = cards[doc.id];
            if (existingCard === undefined) {
              cards[doc.id] = data;
              return;
            }

            Object.assign(existingCard, data);

          });
          this.setState({
            cards: cards,
            loadedCards: true
          });
        }
      ).bind(this)
    );

    this.groupsRef.onSnapshot(
      (
        function(querySnapshot) {

          var groups = this.state.groups;

          querySnapshot.forEach((doc) => {
            let data = doc.data();

            let existingGroup = groups[doc.id];
            if (existingGroup === undefined) {
              groups[doc.id] = data;
              return;
            }

            Object.assign(existingGroup, data);

          });
          this.setState({
            groups: groups,
            loadedGroups: true
          });
        }
      ).bind(this)
    );

    this.datasetRef.collection('highlights').where("Tag", "==", this.tag).onSnapshot(
      (
        function(querySnapshot) {
          console.log("received dataset/{id}/highlights snapshot");
          var highlights = [];
          querySnapshot.forEach((doc) => {
            let data = doc.data();
            data['ID'] = doc.id;
            highlights.push(data);

            let cardData = Object.assign(data, {});
            cardData.groupColor = "#000";
            cardData.textColor = "#FFF";

            // Each highlight should have a card
            let cardRef = this.cardsRef.doc(cardData.ID);
            cardRef.get().then((cardSnapshot) => {
              if (!cardSnapshot.exists) {
                cardRef.set({
                  minX: 0,
                  minY: 0,
                  maxX: 0,
                  maxY: 0,
                  kind: "card",
                  data: data
                });
              }
            });

          });

          this.setState({
            highlights: highlights,
            loadedHighlights: true
          });

        }
      ).bind(this)
    );

  }

  addCardLocation(card) {
    console.log(`addCardLocation (size@pre: ${this.rtree.all().length})`, card);
    this.rtree.insert(card);
    console.log(`addCardLocation add (size@post: ${this.rtree.all().length})`);
  }

  removeCardLocation(card) {
    console.log(`removeCardLocation (size@pre: ${this.rtree.all().length})`, card);
    let removed = this.rtree.remove(
      card,
      (a, b) => {
        console.log(`comparing\n${a.data.ID}\n${b.data.ID}`);
        return a.kind === "card" &&
          b.kind === "card" &&
          a.data.ID === b.data.ID;
      }
    );
    console.log(`removeCardLocation (size@post: ${this.rtree.all().length})`);
  }

  printRTree(rect) {
    console.log('RTree\n', this.rtree.toJSON());
  }

  printRTreeItems(rect) {
    console.log('RTree items\n', this.rtree.all());
  }

  getIntersecting(rect) {
    return this.rtree.search(rect);
  }

  getIntersectingCards(rect) {
    return this.getIntersecting(rect).filter(
      item => item.kind === "card"
    );
  }

  groupDataForCard(card) {
    let undefinedGroupData = {
      ID: undefined,
      color: '#000',
      textColor: '#FFF'
    };

    let cardGroupIDs = new Set();
    let intersections = this.getIntersectingCards(card).filter((c) => {
      return c.data.ID !== card.data.ID
    });

    console.log('groupDataForCard (intersections):\n', intersections);

    // Case 1: The new card location does not intersect with any other card
    if (intersections.length === 0) {

      // If this card was previously part of a group, check whether we need
      // to delete that group (because it became empty or only has one other card)
      if (card.data.groupID !== undefined) {

        // Collect the cards (besides this one) that remain in this card's old group.
        let remainingCards = Object.values(this.state.cards).filter((item) => {
          return (item.data.groupID === card.data.groupID) && (item.data.ID !== card.data.ID);
        });

        if (remainingCards.length < 2) {
          // Delete the group.
          this.groupsRef.doc(card.data.groupID).delete();

          console.log("remainingCards to clean up\n", remainingCards);

          remainingCards.forEach((cardToCleanUP) => {
            cardToCleanUP.data.groupColor = "#000";
            cardToCleanUP.data.textColor = "#FFF";
            delete cardToCleanUP.data['groupID'];
            this.cardsRef.doc(cardToCleanUP.data.ID).set(cardToCleanUP);
          })
        }
      }

      return undefinedGroupData;
    }

    intersections.forEach((obj) => {
      if (obj.data.groupID !== undefined) {
        cardGroupIDs.add(obj.data.groupID);
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
        color: group.data.color,
        textColor: group.data.textColor
      };
    }

    // Case 3: This card intersects with one or more cards, but none of
    // them are currently in a group. We need to create a new group
    // and join all the cards to it.
    if (cardGroupIDs.size === 0) {
      // Create a group.
      console.log("Creating a group");
      let groupID = uuidv4();
      let colors = colorPair();
      this.groupsRef.doc(groupID).set({
        data: {
          ID: groupID,
          name: "Unnamed group",
          color: colors.background,
          textColor: colors.foreground
        }
      });

      intersections.forEach((c) => {
        c.data.groupID = groupID;
        c.data.groupColor = colors.background;
        c.data.textColor = colors.foreground;
        this.cardsRef.doc(c.data.ID).set(c);
      });
      this.setState({ cards: Object.assign({}, this.state.cards) });

      return {
        ID: groupID,
        color: colors.background,
        textColor: colors.foreground
      }
    }

    // Case 4: This card intersects more than one group so we can't join any.
    return undefinedGroupData;
  }

  modalCallBack(highlight, card, rect) {
    this.setState({
      modalShow: true,
      modalHighlight: highlight,
      modalCard: card,
      modalRect: rect,
    })
  }

  render() {
    if (
      !this.state.loadedHighlights ||
      !this.state.loadedCards ||
      !this.state.loadedGroups ||
      this.state.highlights.length !== Object.values(this.state.cards).length
    ) {
      return Loading();
    }

    let cardComponents = [];
    let cards = Object.values(this.state.cards);
    for (let i=0; i<cards.length; i++) {
      let card = cards[i];
      if (card.minX === 0 && card.maxX === 0) {
        card.minX = 0;
        card.minY = 50 + (i * 140);
      }

      cardComponents.push(<Card
        key={card.data.ID}
        card={card}
        groupColor={card.data.groupColor}
        textColor={card.data.textColor}
        cardRef={this.cardsRef.doc(card.data.ID)}
        modalCallBack={this.modalCallBack}
        addLocationCallBack={this.addCardLocation}
        removeLocationCallBack={this.removeCardLocation}
        getIntersectingCallBack={this.getIntersecting}
        groupDataForCardCallback={this.groupDataForCard}
      />);
    }

    let groupComponents = Object.values(this.state.groups).map((group) => {
      let cards = Object.values(this.state.cards).filter((card) => {
        return card.data.groupID === group.data.ID;
      });
      return <Group key={group.data.ID} group={group} cards={cards} />;
    });

    const keyMap = {
      PRINT_TREE: "/",
      PRINT_TREE_ITEMS: "shift+?"
    };

    const keyHandlers = {
      PRINT_TREE: (event) => {
        this.printRTree();
      },

      PRINT_TREE_ITEMS: (event) => {
        this.printRTreeItems();
      }
    };

    return <HotKeys keyMap={keyMap} handlers={keyHandlers}>
      <div className="cardContainer fullHeight">
        {groupComponents}
        {cardComponents}
      </div>
      <HighlightModal
        show={this.state.modalShow}
        highlight={this.state.modalHighlight}
        card={this.state.modalCard}
        rect={this.state.modalRect}
        getIntersectingCallBack={this.getIntersecting}
        onHide={() => this.setState({'modalShow': false})}
      />
    </HotKeys>;
  }
}
