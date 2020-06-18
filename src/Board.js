import React from 'react';
import RBush from 'rbush';
import { v4 as uuidv4 } from 'uuid';

import Card from './Card.js';
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

      let position;

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
      />);
    }

    return <><div className="cardContainer fullHeight">
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
