import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Analysis from "./Analysis.js";
import AnalyzeHelp from "./AnalyzeHelp.js";
import Avatar from "@material-ui/core/Avatar";
import BarChartIcon from "@material-ui/icons/BarChart";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import Shell from "../shell/Shell.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

export default function Analyze({ create }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  let { analysesRef } = useFirestore();

  let { orgID, analysisID } = useParams();

  const navigate = useNavigate();

  const [analysisList, setAnalysisList] = useState(undefined);
  const [analysisMap, setAnalysisMap] = useState(undefined);
  const [listTotal, setListTotal] = useState();

  useEffect(() => {
    if (!analysesRef) {
      return;
    }

    let unsubscribe = analysesRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newAnalysisList = [];
        let newAnalysisMap = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newAnalysisList.push(data);
          newAnalysisMap[data.ID] = data;
        });

        setAnalysisList(newAnalysisList);
        setAnalysisMap(newAnalysisMap);
        setListTotal(snapshot.size);
      });
    return unsubscribe;
  }, [analysesRef]);

  useEffect(() => {
    if (!create || !analysesRef || !oauthClaims.user_id || !oauthClaims.email) {
      return;
    }

    event(firebase, "create_analysis", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    analysesRef
      .add({
        name: "Unnamed analysis",
        documentIDs: [],
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then((doc) => {
        navigate(`/orgs/${orgID}/analyze/${doc.id}`);
      });
  }, [create, analysesRef, firebase, navigate, oauthClaims, orgID]);

  if (analysisList === undefined) {
    return <></>;
  }

  let content;
  if (analysisID && analysisMap) {
    let analysis = analysisMap[analysisID];
    let analysisRef = analysesRef.doc(analysisID);

    content = (
      <Analysis
        key={analysisID}
        analysis={analysis}
        analysisRef={analysisRef}
      />
    );
  }

  let list = (
    <ListContainer sm={3}>
      <Scrollable>
        {listTotal === 0 && <AnalyzeHelp />}
        <List>
          {analysisList.map((analysis) => (
            <>
              <ListItem
                button
                key={analysis.ID}
                selected={analysis.ID === analysisID}
                onClick={() => {
                  navigate(`/orgs/${orgID}/analyze/${analysis.ID}`);
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    <BarChartIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={analysis.name}
                  secondary={
                    <Moment
                      fromNow
                      date={
                        analysis.creationTimestamp &&
                        analysis.creationTimestamp.toDate()
                      }
                    />
                  }
                />
              </ListItem>
            </>
          ))}
        </List>
      </Scrollable>
    </ListContainer>
  );

  if (analysisID) {
    // Optionally hide the list if the viewport is too small
    // list = <Hidden smDown>{list}</Hidden>;
  }

  return (
    <Shell>
      <Grid container className="fullHeight" style={{ position: "relative" }}>
        {list}
        {content}
      </Grid>
    </Shell>
  );
}
