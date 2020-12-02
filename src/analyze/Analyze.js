import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AddIcon from "@material-ui/icons/Add";
import Analysis from "./Analysis.js";
import AnalysisHelp from "./AnalysisHelp.js";
import AnalysisRenameModal from "./AnalysisRenameModal.js";
import AnalyzeHelp from "./AnalyzeHelp.js";
import Avatar from "@material-ui/core/Avatar";
import BarChartIcon from "@material-ui/icons/BarChart";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import DescriptionIcon from "@material-ui/icons/Description";
import Fab from "@material-ui/core/Fab";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
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

export default function Analyze(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  let { analysesRef } = useFirestore();

  let { orgID, analysisID, tabID } = useParams();

  const navigate = useNavigate();

  const [analysisList, setAnalysisList] = useState(undefined);
  const [analysisMap, setAnalysisMap] = useState(undefined);
  const [addModalShow, setAddModalShow] = useState();
  const [newAnalysisRef, setNewAnalysisRef] = useState();
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

  if (analysisList === undefined) {
    return <></>;
  }

  let content = listTotal > 0 && (
    <Hidden smDown>
      <AnalysisHelp />
    </Hidden>
  );

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

  let addModal = (
    <AnalysisRenameModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      analysisRef={newAnalysisRef}
    />
  );

  const onAdd = () => {
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
        setNewAnalysisRef(doc);
        setAddModalShow(true);
      });
  };

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
              {analysis.ID === analysisID && (
                <List>
                  <ListItem
                    button
                    style={{ paddingLeft: "4rem" }}
                    selected={tabID === "data"}
                    onClick={() => {
                      navigate(`/orgs/${orgID}/analyze/${analysis.ID}/data`);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <DescriptionIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Data" />
                  </ListItem>
                  <ListItem
                    button
                    style={{ paddingLeft: "4rem" }}
                    selected={tabID === "cluster"}
                    onClick={() => {
                      navigate(`/orgs/${orgID}/analyze/${analysis.ID}/cluster`);
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <BubbleChartIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Clusters" />
                  </ListItem>
                </List>
              )}
            </>
          ))}
        </List>
      </Scrollable>
      <Fab
        style={{ position: "absolute", bottom: "15px", right: "15px" }}
        color="secondary"
        aria-label="add"
        onClick={onAdd}
      >
        <AddIcon />
      </Fab>
    </ListContainer>
  );

  if (analysisID) {
    // Optionally hide the list if the viewport is too small
    // list = <Hidden smDown>{list}</Hidden>;
  }

  return (
    <Shell>
      <Grid container className="fullHeight">
        {list}
        {content}
        {addModal}
      </Grid>
    </Shell>
  );
}
