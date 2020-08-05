import React, { useState, useEffect } from "react";

import useFirestore from "../db/Firestore.js";

import { Link } from "react-router-dom";

import Scrollable from "../shell/Scrollable.js";
import Tabs from "../shell/Tabs.js";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import { ResponsiveBar } from "@nivo/bar";

import { Loading } from "../util/Utils.js";

export default function DatasetSummaryTab(props) {
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

  // Group subscription
  useEffect(() => {
    if (!groupsRef) {
      return;
    }

    return groupsRef.onSnapshot((snapshot) => {
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

    return cardsRef.onSnapshot((snapshot) => {
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

    if (props.dataset.documentIDs.length == 0) {
      return;
    }

    let highlightsRef = allHighlightsRef
      .where("organizationID", "==", props.orgID)
      .where("documentID", "in", props.dataset.documentIDs);

    return highlightsRef.onSnapshot((snapshot) => {
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

    if (props.dataset.documentIDs.length == 0) {
      return;
    }

    let datasetDocumentsRef = documentsRef.where(
      window.firebase.firestore.FieldPath.documentId(),
      "in",
      props.dataset.documentIDs
    );

    return datasetDocumentsRef.onSnapshot((snapshot) => {
      let newDocuments = {};
      snapshot.forEach((doc) => {
        newDocuments[doc.id] = doc.data();
      });
      setDocuments(newDocuments);
    });
  }, [documentsRef, props.dataset.documentIDs]);

  useEffect(() => {
    if (!allTagsRef) {
      return;
    }

    return allTagsRef
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

    const peopleIDs = Object.values(documents).flatMap((document) => {
      return document.personID ? [document.personID] : [];
    });

    if (peopleIDs.length == 0) {
      setPeople();
      return;
    }

    return peopleRef
      .where(window.firebase.firestore.FieldPath.documentId(), "in", peopleIDs)
      .onSnapshot((snapshot) => {
        let newPeople = {};
        snapshot.forEach((doc) => {
          newPeople[doc.id] = doc.data();
        });
        setPeople(newPeople);
      });
  }, [peopleRef, documents]);

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

  // Builds a tree of tags -> groups -> documents -> people
  // TODO: Replace with AlaSQL
  let analysis = {};
  if (cards && groups && tags && documents && people) {
    let cardsInGroups = Object.values(cards).filter(
      (card) => card.groupID !== undefined
    );

    cardsInGroups.forEach((card) => {
      if (groups[card.groupID].name === "Unnamed group") {
        return;
      }

      let tag = tags[card.tagID];

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

      let documentAnalysis = groupAnalysis[card.documentID];
      if (!(card.documentID in documentAnalysis)) {
        let document = documents[card.documentID];
        let personID = document.personID;
        if (personID) {
          documentAnalysis[personID] = people[personID];
        }
      }
    });
  }

  if (props.dataset.documentIDs.length == 0) {
    return (
      <Tabs.Pane>
        <Tabs.Content>
          <p>
            Start analysis by selecting documents in the{" "}
            <Link to={`/orgs/${props.orgID}/explore/${props.dataset.ID}/data`}>
              data tab
            </Link>
          </p>
        </Tabs.Content>
      </Tabs.Pane>
    );
  }

  console.log("analysis", analysis);

  if (Object.values(analysis).length == 0) {
    return (
      <Tabs.Pane>
        <Tabs.Content>
          <p>
            See a summary of your data by creating clusters per tag, using the
            tags drop down
          </p>
          <p>Note that unnamed clusters won't show up in the statistics</p>
        </Tabs.Content>
      </Tabs.Pane>
    );
  }

  return (
    <Tabs.Pane>
      <Tabs.Content>
        <Scrollable>
          <Container className="p-3">
            {Object.keys(analysis).map((tagName) => {
              let groupNames = [];
              let groupColors = [];
              let groupData = [];

              let labelData = [];
              let labelNames = [];

              Object.keys(analysis[tagName]).forEach((groupID) => {
                let group = groups[groupID];

                groupNames.push(group.name);
                groupColors.push(group.color);

                let groupDataPoint = {};
                groupDataPoint["group"] = group.name;
                groupDataPoint[group.name] = Object.values(
                  analysis[tagName][groupID]
                ).length;

                // Go through people and find label distribution.
                let labelDataPoint = {};
                labelDataPoint["group"] = group.name;
                Object.values(analysis[tagName][groupID]).forEach((card) => {
                  Object.values(card).forEach((person) => {
                    if (person && person.labels) {
                      Object.values(person.labels).forEach((label) => {
                        console.log("label", label);
                        let name = label["name"];

                        if (!labelNames.includes(name)) {
                          labelNames.push(name);
                        }

                        if (!labelDataPoint[name]) {
                          labelDataPoint[name] = 0;
                        }
                        labelDataPoint[name] += 1;
                      });
                    }
                  });
                });

                labelData.push(labelDataPoint);
                groupData.push(groupDataPoint);
              });

              console.log("groupNames:", groupNames);

              return (
                <>
                  {groupNames.length > 0 && (
                    <Row>
                      <Col>
                        <h4>{tagName}</h4>
                        <b>Total</b>
                        <div style={{ height: "20rem" }}>
                          <ResponsiveBar
                            data={groupData}
                            keys={groupNames}
                            indexBy="group"
                            margin={{
                              top: 50,
                              right: 130,
                              bottom: 50,
                              left: 60,
                            }}
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
                  )}
                  {labelNames.length > 0 && (
                    <Row>
                      <Col>
                        <b>Label distribution</b>
                        <div style={{ height: "20rem" }}>
                          <ResponsiveBar
                            indexBy="group"
                            data={labelData}
                            keys={labelNames}
                            groupMode="grouped"
                            margin={{
                              top: 50,
                              right: 130,
                              bottom: 50,
                              left: 60,
                            }}
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
                  )}
                </>
              );
            })}
          </Container>
        </Scrollable>
      </Tabs.Content>
    </Tabs.Pane>
  );
}
