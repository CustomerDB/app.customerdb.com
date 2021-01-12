import React, { useContext, useEffect, useState } from "react";

import FirebaseContext from "../util/FirebaseContext.js";
import GetAppIcon from "@material-ui/icons/GetApp";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import { ResponsiveBar } from "@nivo/bar";
import Scrollable from "../shell/Scrollable.js";
import domToImage from "dom-to-image";
import useFirestore from "../db/Firestore.js";
import { Link } from "react-router-dom";
import Button from "@material-ui/core/Button";

export default function AnalysisSummaryTab(props) {
  const {
    documentsRef,
    cardsRef,
    groupsRef,
    allTagsRef,
    peopleRef,
  } = useFirestore();

  const firebase = useContext(FirebaseContext);

  const [groups, setGroups] = useState();
  const [cards, setCards] = useState();
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
    if (!cardsRef || !props.analysis) {
      return;
    }

    return cardsRef.onSnapshot((snapshot) => {
      let newCards = {};
      snapshot.forEach((doc) => {
        // Only include cards for currently selected documents.
        //
        // We try to prevent this in the data selection and clustering
        // tabs by deleting cards, but this is just to make sure we don't
        // include anything extra in case those deletes failed for some
        // reason or we're still awaiting read repair by the board.
        let cardData = doc.data();
        if (props.analysis.documentIDs.includes(cardData.documentID)) {
          newCards[doc.id] = cardData;
        }
      });
      setCards(newCards);
    });
  }, [cardsRef, props.analysis]);

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    if (props.analysis.documentIDs.length === 0) {
      return;
    }

    let analysisDocumentsRef = documentsRef
      .where("deletionTimestamp", "==", "")
      .where(
        firebase.firestore.FieldPath.documentId(),
        "in",
        props.analysis.documentIDs
      );

    return analysisDocumentsRef.onSnapshot((snapshot) => {
      let newDocuments = {};
      snapshot.forEach((doc) => {
        newDocuments[doc.id] = doc.data();
      });
      setDocuments(newDocuments);
    });
  }, [documentsRef, props.analysis.documentIDs, firebase.firestore.FieldPath]);

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

    if (peopleIDs.length === 0) {
      setPeople();
      return;
    }

    return peopleRef
      .where(firebase.firestore.FieldPath.documentId(), "in", peopleIDs)
      .onSnapshot((snapshot) => {
        let newPeople = {};
        snapshot.forEach((doc) => {
          newPeople[doc.id] = doc.data();
        });
        setPeople(newPeople);
      });
  }, [peopleRef, documents, firebase.firestore.FieldPath]);

  if (!documentsRef || !cardsRef || !groupsRef || !allTagsRef || !peopleRef) {
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

  if (props.analysis.documentIDs.length === 0) {
    return (
      <>
        <p>
          Start analysis by selecting documents in the{" "}
          <Link to={`/orgs/${props.orgID}/boards/${props.analysis.ID}/data`}>
            data tab
          </Link>
        </p>
      </>
    );
  }

  if (Object.values(analysis).length === 0) {
    return (
      <p>
        See a summary of your data by creating clusters per tag, using the tags
        drop down.
      </p>
    );
  }

  return (
    <>
      <Grid container style={{ position: "relative", flexGrow: 1 }}>
        <Scrollable>
          <Grid container>
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

              let exportID = `graphs-${tagName}`;
              let exportButtonID = `${exportID}-export-button`;

              return (
                <Grid container>
                  <div key={exportID} id={exportID} style={{ width: "100%" }}>
                    <Grid container item>
                      <Grid item>
                        <h4>
                          {tagName}
                          <Button
                            id={exportButtonID}
                            title="Download graph image"
                            style={{ marginLeft: "1rem" }}
                            variant="contained"
                            onClick={() => {
                              let filter = (node) => {
                                return node.id !== exportButtonID;
                              };
                              let domNode = document.getElementById(exportID);
                              domToImage
                                .toPng(domNode, { filter: filter })
                                .then((dataURL) => {
                                  let link = document.createElement("a");
                                  link.download = `CustomerDB (${props.analysis.name}) - ${tagName}.png`;
                                  link.href = dataURL;
                                  link.click();
                                });
                            }}
                          >
                            <GetAppIcon />
                          </Button>
                        </h4>
                      </Grid>
                    </Grid>
                    <Grid container item>
                      {groupNames.length > 0 && (
                        <Grid item md={6} xs={12}>
                          <b>Total</b>
                          <div style={{ height: "25rem" }}>
                            <ResponsiveBar
                              isInteractive={false}
                              data={groupData}
                              keys={groupNames}
                              maxValue={props.analysis.documentIDs.length}
                              indexBy="group"
                              margin={{
                                top: 50,
                                right: 130,
                                bottom: 150,
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
                                tickRotation: 45,
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: "People represented",
                                legendPosition: "middle",
                                legendOffset: -40,
                                tickValues: props.analysis.documentIDs.length,
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
                        </Grid>
                      )}
                      {labelNames.length > 0 && (
                        <Grid item md={6} xs={12}>
                          <b>Label distribution</b>
                          <div style={{ height: "25rem" }}>
                            <ResponsiveBar
                              indexBy="group"
                              data={labelData}
                              keys={labelNames}
                              maxValue={props.analysis.documentIDs.length}
                              groupMode="grouped"
                              margin={{
                                top: 50,
                                right: 130,
                                bottom: 150,
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
                                tickRotation: 45,
                              }}
                              axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: "People represented",
                                legendPosition: "middle",
                                legendOffset: -40,
                                tickValues: props.analysis.documentIDs.length,
                              }}
                              legends={[
                                {
                                  dataFrom: "keys",
                                  anchor: "bottom-right",
                                  direction: "column",
                                  justify: false,
                                  translateX: 120,
                                  translateY: 0,
                                  itemsSpacing: 2,
                                  itemWidth: 100,
                                  itemHeight: 20,
                                  itemDirection: "left-to-right",
                                  itemOpacity: 0.85,
                                  symbolSize: 20,
                                  effects: [
                                    {
                                      on: "hover",
                                      style: {
                                        itemOpacity: 1,
                                      },
                                    },
                                  ],
                                },
                              ]}
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
                        </Grid>
                      )}
                    </Grid>
                  </div>
                </Grid>
              );
            })}
          </Grid>
        </Scrollable>
      </Grid>
    </>
  );
}
