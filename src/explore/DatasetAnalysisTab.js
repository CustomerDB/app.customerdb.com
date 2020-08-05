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
    peopleRef,
  } = useFirestore();

  const [groups, setGroups] = useState();
  const [cards, setCards] = useState();
  const [highlights, setHighlights] = useState();
  const [documents, setDocuments] = useState();
  const [tags, setTags] = useState();
  const [people, setPeople] = useState();

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
  }, [documentsRef, props.dataset.documentIDs]);

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
  }, [allTagsRef, props.orgID]);

  useEffect(() => {
    if (!peopleRef || !documents) {
      return;
    }

    const peopleIDs = Object.values(documents).flatmap((document) =>
      document.peopleID ? [document.peopleID] : []
    );

    peopleRef
      .where(window.firebase.firestore.FieldPath.documentId(), "==", peopleIDs)
      .onSnapshot((snapshot) => {
        let newPeople = {};
        snapshot.forEach((doc) => {
          newPeople[doc.id] = doc.data();
        });
        setPeople(newPeople);
      });
  }, [peopleRef, documents]);

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
    !allTagsRef ||
    !peopleRef
  ) {
    return <Loading />;
  }

  let analysis = {};

  if (cards && groups && tags && documents && people) {
    let cardsInGroups = Object.values(cards).filter(
      (card) => card.groupID !== undefined
    );
    console.log("cardsInGroups", cardsInGroups);

    cardsInGroups.forEach((card) => {
      let tag = tags[card.tagID];

      if (!(tag.name in analysis)) {
        analysis[tag.name] = {};
      }

      let tagAnalysis = analysis[tag.name];
      if (!(card.groupID in tagAnalysis)) {
        tagAnalysis[card.groupID] = {};
      }

      if (groups[card.groupID].name === "Unnamed group") {
        return;
      }

      let groupAnalysis = tagAnalysis[card.groupID];
      if (!(card.documentID in groupAnalysis)) {
        groupAnalysis[card.documentID] = {};
      }

      let groupAnalysis = tagAnalysis[card.groupID];
      if (!(card.documentID in groupAnalysis)) {
        groupAnalysis[card.documentID] = {};
      }

      let documentAnalysis = groupAnalysis[card.documentID];
      if (!(card.documentID in groupAnalysis)) {
        let personID = document[card.documentID].personID;
        if (personID) {
          documentAnalysis[personID] = person[personID];
        }
      }
    });
  }

  return (
    <>
      <Container className="p-3">
        <Row>
          <Col></Col>
        </Row>
        {Object.keys(analysis).map((tagName) => {
          let groupNames = [];
          let groupColors = [];
          let data = [];
          Object.keys(analysis[tagName]).forEach((groupID) => {
            let group = groups[groupID];

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
