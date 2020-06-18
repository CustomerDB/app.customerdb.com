import React from 'react';
import RBush from 'rbush';
import { v4 as uuidv4 } from 'uuid';

import Card from './Card.js';
import Group from './Group.js';
import HighlightModal from './HighlightModal.js';
import colorPair from './color.js';
import { Loading } from './Utils.js';

function makeCard(data, rect) {
  let card = Object.assign(rect, {});
  card.data = data;
  card.kind = "card";
  return card;
}

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
    }

    this.rtree = new RBush(4);

    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);

    this.groupIDForCard = this.groupIDForCard.bind(this);
  }

  componentDidMount() {
    this.cardsRef.onSnapshot(
      (
        function(querySnapshot) {
          console.log("received boards/{id}/cards snapshot");
          var cards = {};
          querySnapshot.forEach((doc) => {
            let data = doc.data();
            cards[doc.id] = data;
          });
          this.setState({
            cards: cards,
            loadedCards: true
          });
          console.log("cards: ", cards);
        }
      ).bind(this)
    );

    this.groupsRef.onSnapshot(
      (
        function(querySnapshot) {
        var groups = {};
        querySnapshot.forEach((doc) => {
          let data = doc.data();
          groups[doc.id] = data;
        });
        this.setState({
          groups: groups,
          loadedGroups: true
        });
      }).bind(this)
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
    this.rtree.insert(card);
  }

  removeCardLocation(card) {
    this.rtree.remove(
      card,
      (a, b) => {
        if (a.kind !== "card" || b.kind !== "card") {
          return false;
        }
        return a.data.ID === b.data.ID;
      }
    );
  }

  getIntersecting(rect) {
    return this.rtree.search(rect);
  }

  getIntersectingCards(rect) {
    return this.getIntersecting(rect).filter((item) => {
      return item.kind === "card";
    });
  }

  groupIDForCard(card) {
    let cardGroupIDs = new Set();
    let intersections = this.getIntersectingCards(card);
    if (intersections.length == 0) {
      if (card.data.groupID !== undefined) {
        let remainingCards = Object.values(this.state.cards).filter((item) => {
          return (item.data.groupID === card.data.groupID) && (item.data.ID !== card.data.ID);
        });

        if (remainingCards.length < 2) {
          // Delete group.
          this.groupsRef.doc(card.data.groupID).delete();

          remainingCards.forEach((cardToCleanUP) => {
            cardToCleanUP.data.groupColor = "#000";
            cardToCleanUP.data.textColor = "#FFF";
            delete cardToCleanUP.data['groupID'];
            this.cardsRef.doc(cardToCleanUP.data.ID).set(cardToCleanUP);
          })
        }
      }

      return undefined;
    }

    intersections.forEach((obj) => {
      if (obj.data.groupID !== undefined) {
        cardGroupIDs.add(obj.data.groupID);
      }
    });

    let thisCardGroupID = card.data.groupID;
    if (cardGroupIDs.size == 1) {
      return cardGroupIDs.values().next().value;
    }

    if (cardGroupIDs.size == 0) {
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

      return groupID;
    }

    // If cardGroupIDs is greater than 2, we are spanning two groups and can't join either.
    return undefined;
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
      this.state.highlights.length != Object.values(this.state.cards).length
    ) {
      return Loading();
    }

    let cardComponents = [];
		let cards = Object.values(this.state.cards);
    for (let i=0; i<cards.length; i++) {
      let card = cards[i];
      if (card.minX == 0 && card.maxX == 0) {
				card.minX = 0;
				card.minY = 50 + (i * 140);
      }

      cardComponents.push(<Card
        key={card.data.ID}
        card={card}
        cardRef={this.cardsRef.doc(card.data.ID)}
        modalCallBack={this.modalCallBack}
        addLocationCallBack={this.addCardLocation}
        removeLocationCallBack={this.removeCardLocation}
        getIntersectingCallBack={this.getIntersecting}
        groupIDForCardCallback={this.groupIDForCard}
      />);
    }

    let groupComponents = [];
    Object.values(this.state.groups).forEach((group) => {
      let cards = Object.values(this.state.cards).filter((item) => {
        return item.data.groupID == group.data.ID;
      });
      groupComponents.push(<Group cards={cards} group={group}/>);
    });

    return <><div className="cardContainer fullHeight">
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
    </>;
  }
}
