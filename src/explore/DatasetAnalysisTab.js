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
      if (!(card.groupID in tagAnalysis)) {
        tagAnalysis[card.groupID] = {};
      }

      let groupAnalysis = tagAnalysis[card.groupID];
      if (!(card.documentID in groupAnalysis)) {
        groupAnalysis[card.documentID] = {};
      }
    });
  }

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
          let groupColors = [];
          let data = [];
          Object.keys(analysis[tagName]).map((groupID) => {
            let group = groups[groupID];

            // TODO: Chart will flicker if the unnamed groups compete for the same bar.
            if (group.name == "Unnamed group") {
              return;
            }

            groupNames.push(group.name);
            groupColors.push(group.color);

            let dataPoint = {};
            dataPoint["group"] = group.name;
            dataPoint[group.name] = Object.values(
              analysis[tagName][groupID]
            ).length;
            data.push(dataPoint);
          });
          return (
            <Row>
              <Col>
                <h4>{tagName}</h4>
                <div style={{ height: "20rem" }}>
                  <ResponsiveBar
                    data={data}
                    keys={groupNames}
                    indexBy="group"
                    margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                    padding={0.3}
                    colors={groupColors}
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
