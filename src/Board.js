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
          });
          this.setState({
            highlights: highlights,
            loadedHighlights: true
          });
        }
      ).bind(this)
    );

  }

  addCardLocation(data, rect) {
    // @pre:
    //
    // data has a field called ID
    //
    // rect looks like this:
    // {"x":307,"y":317,"width":238,"height":40,"top":317,"right":545,"bottom":357,"left":307}
    let card = makeCard(data, rect);

    this.rtree.insert(card);

    Object.assign(card,{
      minX: rect.minX,
      minY: rect.minY,
      maxX: rect.maxX,
      maxY: rect.maxY
    });

    this.cardsRef.doc(card.data.ID).set(card);
  }

  removeCardLocation(data, rect) {
    // @pre:
    //
    // data has a field called ID
    console.log("Removing card with id", data.ID);

    let card = makeCard(data, rect);

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
    if (!this.state.loadedHighlights || !this.state.loadedCards) {
      return Loading();
    }

    let cardComponents = [];
    for (let i=0; i<this.state.highlights.length; i++) {
      let h = this.state.highlights[i];

      let position;

      let card;

      if (this.state.cards.hasOwnProperty(h.ID)) {
        card = this.state.cards[h.ID];
        position = {
          x: card.minX,
          y: card.minY
        }
      } else {
        position = {
          x: 0,
          y: 50 + (i * 140)
        };
      }

      cardComponents.push(<Card
        key={h.ID}
        defaultPos={position}
        highlight={h}
        card={card}
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
