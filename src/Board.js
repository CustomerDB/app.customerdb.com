import React from 'react';
import RBush from 'rbush';
import { v4 as uuidv4 } from 'uuid';

import Card from './Card.js';
import HighlightModal from './HighlightModal.js';
import Group from './Group.js';
import colorPair from './color.js';
import { Loading } from './Utils.js';

function makeCard(data, rect) {
  let card = Object.assign(rect, {});
  card.data = data;
  card.kind = "card";
  return card;
}

function recomputeGroupBounds(group) {
  if (group.data.cards.length > 0) {
    let card0 = group.data.cards[0];
    group.minX = card0.minX;
    group.minY = card0.minY;
    group.maxX = card0.maxX;
    group.maxY = card0.maxY;

    group.data.cards.forEach((card) => {
      group.minX = Math.min(group.minX, card.minX);
      group.minY = Math.min(group.minY, card.minY);
      group.maxX = Math.max(group.maxX, card.maxX);
      group.maxY = Math.max(group.maxY, card.maxY);
    });
  }
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
      loadedGroups: false,

      highlights: [],
      modalShow: false,
      modalData: undefined,
      modalRect: undefined,

      cards: {},

      // Groups is indexed by groupID, and contains data
      // that looks like this:
      //
      // groups: {
      //   foo: {
      //     data: {
      //       name: "foo",
      //       cards: []
      //     },
      //     kind: "group",
      //     minX: 0,
      //     minY: 0,
      //     maxX: 0,
      //     maxY: 0
      //   }
      // }
      groups: {}
    }

    this.rtree = new RBush(4);

    this.addCardLocation = this.addCardLocation.bind(this);
    this.removeCardLocation = this.removeCardLocation.bind(this);
    this.removeCardLocationFromGroup = this.removeCardLocationFromGroup.bind(this);

    this.addGroupLocation = this.addGroupLocation.bind(this);
    this.removeGroupLocation = this.removeGroupLocation.bind(this);

    this.getIntersecting = this.getIntersecting.bind(this);
    this.getIntersectingCards = this.getIntersectingCards.bind(this);
    this.getIntersectingGroups = this.getIntersectingGroups.bind(this);

    this.modalCallBack = this.modalCallBack.bind(this);

    this.addCardToGroup = this.addCardToGroup.bind(this);
    this.removeCardFromGroup = this.removeCardFromGroup.bind(this);
    this.createGroup = this.createGroup.bind(this);

    this.groupsForRect = this.groupsForRect.bind(this);
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

  addCardToGroup(groupID, card) {
    let groups = this.state.groups;
    let group = groups[groupID];

    card.data.groupID = group.data.ID;
    card.data.groupColor = group.data.color;
    card.data.textColor = group.data.textColor;

    group.data.cards = group.data.cards.filter((e) => {
      return e.data.ID !== card.data.ID
    });

    group.data.cards.push(card);

    // Delete old group record from rtree
    this.removeGroupLocation(group);

    // Update group bounding box
    recomputeGroupBounds(group);

    // Re-insert group into rtree and re-render
    this.addGroupLocation(group);
    this.setState({ groups: groups });

    this.cardsRef.doc(card.data.ID).update({groupID: groupID});
  }

  removeCardFromGroup(card) {
    if (card.data.groupID === undefined) {
      return;
    }

    let groupID = card.data.groupID;
    let groups = this.state.groups;
    let group = groups[groupID];

    card.data.groupID = undefined;
    card.data.groupColor = "#000";
    card.data.textColor = "#FFF";

    group.data.cards = group.data.cards.filter((e) => {
      return e.data.ID !== card.data.ID
    });

    // Delete old group record from rtree
    this.removeGroupLocation(group);

    if (group.data.cards.length > 1) {
      // Update group bounding box
      recomputeGroupBounds(group);

      // Re-insert group into rtree
      this.addGroupLocation(group);
    } else {
      // Remove group
      group.data.cards.forEach((card) => {
        this.removeCardFromGroup(card);
      })
      delete groups[groupID];
    }

    this.setState({ groups: groups });
  }

  createGroup(cards) {
    let id = uuidv4();
    let card = cards[0];
    let colors = colorPair();
    let color = colors.background;
    let textColor = colors.foreground;
    let groups = this.state.groups;

    groups[id] = {
        minX: card.minX,
        minY: card.minY,
        maxX: card.maxX,
        maxY: card.maxY,
        kind: "group",
        data: {
          ID: id,
          name: "Unnamed group",
          color: color,
          textColor: textColor,
          cards: []
        }
      }

    this.setState({ groups: groups });

    cards.forEach((card) => {
      this.addCardToGroup(id, card);
    })
  }

  groupsForRect(rect) {
    let intersections = this.getIntersectingCards(rect);
    let groups = intersections.flatMap((c) => {
      let groupID = c.data.groupID;
      return (groupID === undefined) ? [] : [this.state.groups[groupID]];
    });
    return [...new Set(groups)];
  }

  addCardLocation(data, rect) {
    // @pre:
    //
    // data has a field called ID
    //
    // rect looks like this:
    // {"x":307,"y":317,"width":238,"height":40,"top":317,"right":545,"bottom":357,"left":307}
    let card = makeCard(data, rect);

    let groups = this.groupsForRect(rect);
    if (groups.length === 0) {
      this.removeCardFromGroup(card);
      let intersections = this.getIntersectingCards(rect);
      if (intersections.length > 0) {
        // Create a new group
        intersections.push(card);
        this.createGroup(intersections);
      }
    }
    if (groups.length === 1) {
      let group = groups[0];
      if (card.data.groupID !== group.data.ID) {
        this.removeCardFromGroup(card);
      }
      this.addCardToGroup(group.data.ID, card);
    }
    if (groups.length > 1) {
      console.error("Unsupported group merge via drag: groups: ", groups.map((g) => { return g.data.ID; }));
    }

    this.rtree.insert(card);

    this.cardsRef.doc(card.data.ID).set({
      minX: rect.minX,
      minY: rect.minY,
      maxX: rect.maxX,
      maxY: rect.maxY
    });
  }

  removeCardLocationFromGroup(data, rect) {
    // Remove this card from a group (if it's part of a group)
    let card = makeCard(data, rect);
    this.removeCardFromGroup(card);
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

  addGroupLocation(group) {
    // @pre:
    //
    // data has a field called name
    console.log("Inserting group ", group);

    this.rtree.insert(group);
  }

  removeGroupLocation(group) {
    // @pre:
    //
    // data has a field called id
    console.log("Removing group with id", group.data.ID);

    this.rtree.remove(
      group,
      (a, b) => {
        // console.log("comparing", a.data.ID, b.data.ID);
        if (a.kind !== "group" || b.kind !== "group") return false;
        return a.data.ID === b.data.ID;
      }
    );
  }

  getIntersecting(rect) {
    return this.rtree.search(rect);
  }

  getIntersectingGroups(rect) {
    return this.getIntersecting(rect).filter((item) => {
      return item.kind === "group";
    });
  }

  getIntersectingCards(rect) {
    return this.getIntersecting(rect).filter((item) => {
      return item.kind === "card";
    });
  }

  modalCallBack(data, rect) {
    this.setState({
      modalShow: true,
      modalData: data,
      modalRect: rect,
    })
  }

  render() {
    if (!this.state.loadedHighlights || !this.state.loadedCards) {
      return Loading();
    }

    let cards = [];
    for (let i=0; i<this.state.highlights.length; i++) {
      let h = this.state.highlights[i];

      let position;
      if (this.state.cards.hasOwnProperty(h.ID)) {
        let cardRect = this.state.cards[h.ID];
        console.log(`card ${h.ID} has location: (${cardRect.minX}, ${cardRect.minY})`);
        position = {
          x: cardRect.minX,
          y: cardRect.minY
        }
      } else {
        position = {
          x: 0,
          y: 50 + (i * 140)
        };
      }

      cards.push(<Card
        key={h.ID}
        defaultPos={position}
        data={h}
        modalCallBack={this.modalCallBack}
        addLocationCallBack={this.addCardLocation}
        removeLocationCallBack={this.removeCardLocation}
        removeFromGroupCallBack={this.removeCardLocationFromGroup}
        getIntersectingCallBack={this.getIntersecting}
      />);
    }

    let groups = Object.values(this.state.groups).map((g) => {
      return <Group groupObject={g}/>
    });

    return <><div className="cardContainer fullHeight">
      {groups}
      {cards}
    </div>
    <HighlightModal
      show={this.state.modalShow}
      data={this.state.modalData}
      rect={this.state.modalRect}
      getIntersectingCallBack={this.getIntersecting}
      onHide={() => this.setState({'modalShow': false})}
    />
    </>;
  }
}
