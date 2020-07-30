import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { ResponsiveBar } from "@nivo/bar";

import { Loading } from "../util/Utils.js";

export default function DatasetAnalysisTab(props) {
  const {
    documentsRef,
    cardsRef,
    groupsRef,
    allHighlightsRef,
    allTagsRef,
  } = useFirestore();

  const [groups, setGroups] = useState();
  const [cards, setCards] = useState();
  const [highlights, setHighlights] = useState();
  const [documents, setDocuments] = useState();
  const [tags, setTags] = useState();

  console.log("Render analysis tab ", props);

  // Group subscription
  useEffect(() => {
    if (!groupsRef) {
      return;
    }

    groupsRef.onSnapshot((snapshot) => {
      let newGroups = {};
      snapshot.forEach((doc) => {
        newGroups[doc.id] = doc.data();
      });
      setGroups(newGroups);
    });
  }, [groupsRef]);

  useEffect(() => {
    if (!cardsRef) {
      return;
    }

    cardsRef.onSnapshot((snapshot) => {
      let newCards = {};
      snapshot.forEach((doc) => {
        newCards[doc.id] = doc.data();
      });
      setCards(newCards);
    });
  }, [cardsRef]);

  useEffect(() => {
    if (!allHighlightsRef || !props.orgID || !props.dataset.documentIDs) {
      return;
    }

    console.log("Getting highlights for ", props.dataset.documentIDs);

    let highlightsRef = allHighlightsRef
      .where("organizationID", "==", props.orgID)
      .where("documentID", "in", props.dataset.documentIDs);

    highlightsRef.onSnapshot((snapshot) => {
      let newHighlights = {};
      console.log("Received highlights");
      snapshot.forEach((doc) => {
        newHighlights[doc.id] = doc.data();
      });
      setHighlights(newHighlights);
    });
  }, [allHighlightsRef, props.orgID, props.dataset.documentIDs]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    console.log("Setting up documents snapshot handler");

    let datasetDocumentsRef = documentsRef.where(
      window.firebase.firestore.FieldPath.documentId(),
      "in",
      props.dataset.documentIDs
    );

    let newDocuments = {};
    datasetDocumentsRef.onSnapshot((snapshot) => {
      console.log("Received documents");
      snapshot.forEach((doc) => {
        newDocuments[doc.id] = doc.data();
      });
    });
    setDocuments(newDocuments);
  }, [documentsRef]);

  useEffect(() => {
    if (!allTagsRef) {
      return;
    }

    allTagsRef
      .where("organizationID", "==", props.orgID)
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          newTags[doc.id] = doc.data();
        });
        setTags(newTags);
      });
  }, [allTagsRef]);

  console.log("groups", groups);
  console.log("highlights", highlights);
  console.log("cards", cards);
  console.log("documents", documents);
  console.log("tags", tags);

  if (
    !documentsRef ||
    !cardsRef ||
    !allHighlightsRef ||
    !groupsRef ||
    !allTagsRef
  ) {
    return <Loading />;
  }

  let analysis = {};
  let totalDocuments = props.dataset.documentIDs.length;

  if (cards && groups && tags && props.dataset.documentIDs) {
    let cardsInGroups = Object.values(cards).filter(
      (card) => card.groupID != undefined
    );
    console.log("cardsInGroups", cardsInGroups);

    cardsInGroups.forEach((card) => {
      let group = groups[card.groupID];
      let tag = tags[card.tagID];
      let document = documents[card.documentID];

      if (!(tag.name in analysis)) {
        analysis[tag.name] = {};
      }

      let tagAnalysis = analysis[tag.name];
      if (!(group.name in tagAnalysis)) {
        tagAnalysis[group.name] = {};
      }

      let groupAnalysis = tagAnalysis[group.name];
      if (!(card.documentID in groupAnalysis)) {
        groupAnalysis[card.documentID] = {};
      }
    });
  }

  // let data = [
  //   {
  //     "group": "Unnamed group",
  //     "hot dog": 128,
  //     "hot dogColor": "hsl(291, 70%, 50%)",
  //   },
  //   {
  //     "group": "AE",
  //     "hot dog": 124,
  //     "hot dogColor": "hsl(219, 70%, 50%)",
  //     "burger": 57,
  //     "burgerColor": "hsl(127, 70%, 50%)",
  //     "sandwich": 4,
  //     "sandwichColor": "hsl(113, 70%, 50%)",
  //     "kebab": 21,
  //     "kebabColor": "hsl(332, 70%, 50%)",
  //     "fries": 196,
  //     "friesColor": "hsl(116, 70%, 50%)",
  //     "donut": 48,
  //     "donutColor": "hsl(93, 70%, 50%)"
  //   },
  //   {
  //     "group": "AF",
  //     "hot dog": 176,
  //     "hot dogColor": "hsl(169, 70%, 50%)",
  //     "burger": 141,
  //     "burgerColor": "hsl(117, 70%, 50%)",
  //     "sandwich": 191,
  //     "sandwichColor": "hsl(310, 70%, 50%)",
  //     "kebab": 10,
  //     "kebabColor": "hsl(46, 70%, 50%)",
  //     "fries": 77,
  //     "friesColor": "hsl(85, 70%, 50%)",
  //     "donut": 137,
  //     "donutColor": "hsl(360, 70%, 50%)"
  //   },
  //   {
  //     "group": "AG",
  //     "hot dog": 113,
  //     "hot dogColor": "hsl(215, 70%, 50%)",
  //     "burger": 87,
  //     "burgerColor": "hsl(53, 70%, 50%)",
  //     "sandwich": 151,
  //     "sandwichColor": "hsl(233, 70%, 50%)",
  //     "kebab": 109,
  //     "kebabColor": "hsl(291, 70%, 50%)",
  //     "fries": 19,
  //     "friesColor": "hsl(325, 70%, 50%)",
  //     "donut": 175,
  //     "donutColor": "hsl(94, 70%, 50%)"
  //   },
  //   {
  //     "group": "AI",
  //     "hot dog": 144,
  //     "hot dogColor": "hsl(289, 70%, 50%)",
  //     "burger": 133,
  //     "burgerColor": "hsl(25, 70%, 50%)",
  //     "sandwich": 73,
  //     "sandwichColor": "hsl(186, 70%, 50%)",
  //     "kebab": 52,
  //     "kebabColor": "hsl(242, 70%, 50%)",
  //     "fries": 135,
  //     "friesColor": "hsl(183, 70%, 50%)",
  //     "donut": 93,
  //     "donutColor": "hsl(255, 70%, 50%)"
  //   },
  //   {
  //     "group": "AL",
  //     "hot dog": 180,
  //     "hot dogColor": "hsl(15, 70%, 50%)",
  //     "burger": 95,
  //     "burgerColor": "hsl(44, 70%, 50%)",
  //     "sandwich": 14,
  //     "sandwichColor": "hsl(230, 70%, 50%)",
  //     "kebab": 67,
  //     "kebabColor": "hsl(191, 70%, 50%)",
  //     "fries": 38,
  //     "friesColor": "hsl(55, 70%, 50%)",
  //     "donut": 134,
  //     "donutColor": "hsl(218, 70%, 50%)"
  //   },
  //   {
  //     "group": "AM",
  //     "hot dog": 195,
  //     "hot dogColor": "hsl(288, 70%, 50%)",
  //     "burger": 184,
  //     "burgerColor": "hsl(290, 70%, 50%)",
  //     "sandwich": 167,
  //     "sandwichColor": "hsl(102, 70%, 50%)",
  //     "kebab": 43,
  //     "kebabColor": "hsl(98, 70%, 50%)",
  //     "fries": 50,
  //     "friesColor": "hsl(266, 70%, 50%)",
  //     "donut": 151,
  //     "donutColor": "hsl(286, 70%, 50%)"
  //   }
  // ];

  return (
    <>
      <Container className="p-3">
        <Row>
          <Col>
            <h3></h3>
          </Col>
        </Row>
        <Row>
          <Col></Col>
        </Row>
        {Object.keys(analysis).map((tagName) => {
          let groupNames = [];
          let data = [];
          Object.keys(analysis[tagName]).map((groupName) => {
            groupNames.push(groupName);
            data.push({
              group: groupName,
              people: Object.values(analysis[tagName][groupName]).length,
            });
          });
          return (
            <Row>
              <Col>
                <h4>{tagName}</h4>
                <div style={{ height: "20rem" }}>
                  <ResponsiveBar
                    data={data}
                    keys={["people"]}
                    indexBy="group"
                    margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                    padding={0.3}
                    colors={{ scheme: "nivo" }}
                    borderColor={{
                      from: "color",
                      modifiers: [["darker", 1.6]],
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "group",
                      legendPosition: "middle",
                      legendOffset: 32,
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: "People represented",
                      legendPosition: "middle",
                      legendOffset: -40,
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{
                      from: "color",
                      modifiers: [["darker", 1.6]],
                    }}
                    animate={true}
                    motionStiffness={90}
                    motionDamping={15}
                  />
                </div>
              </Col>
            </Row>
          );
        })}
      </Container>
    </>
  );
}
