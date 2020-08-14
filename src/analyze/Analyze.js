import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

import Shell from "../shell/Shell.js";

import Scrollable from "../shell_obsolete/Scrollable.js";
import Options from "../shell_obsolete/Options.js";

import Analysis from "./Analysis.js";
import AnalysisDeleteModal from "./AnalysisDeleteModal.js";
import AnalysisRenameModal from "./AnalysisRenameModal.js";
import AnalyzeHelp from "./AnalyzeHelp.js";
import Avatar from "@material-ui/core/Avatar";
import AnalysisHelp from "./AnalysisHelp.js";
import Grid from "@material-ui/core/Grid";
import ListContainer from "../shell/ListContainer";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import BarChartIcon from "@material-ui/icons/BarChart";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";

import Moment from "react-moment";

import { useParams, useNavigate } from "react-router-dom";
import WithFocus from "../util/WithFocus.js";

export default function Analyze(props) {
  const { oauthClaims } = useContext(UserAuthContext);

  let { analysesRef } = useFirestore();

  let { orgID, analysisID } = useParams();

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

  const options = (analysisID) => {
    if (!analysisID) {
      return <></>;
    }

    let analysisRef = analysesRef.doc(analysisID);

    return (
      <Options key={analysisID}>
        <Options.Item
          name="Rename"
          modal={<AnalysisRenameModal analysisRef={analysisRef} />}
        />

        <Options.Item
          name="Delete"
          modal={<AnalysisDeleteModal analysisRef={analysisRef} />}
        />
      </Options>
    );
  };

  let content;
  if (analysisID && analysisMap) {
    let analysis = analysisMap[analysisID];
    content = (
      <Analysis
        key={analysisID}
        analysis={analysis}
        options={options(analysisID)}
      />
    );
  } else if (listTotal > 0) {
    content = <AnalysisHelp />;
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

  let listItems = analysisList.map((analysis) => (
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
              analysis.creationTimestamp && analysis.creationTimestamp.toDate()
            }
          />
        }
      />
    </ListItem>
  ));

  const onAdd = () => {
    event("create_analysis", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    analysesRef
      .add({
        name: "Unnamed analysis",
        documentIDs: [],
        createdBy: oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then((doc) => {
        setNewAnalysisRef(doc);
        setAddModalShow(true);
      });
  };

  return (
    <Shell title="Analysis">
      <Grid container alignItems="stretch">
        <ListContainer>
          <Scrollable>
            <List>{listTotal > 0 ? listItems : <AnalyzeHelp />}</List>
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
        {content}
        {addModal}
      </Grid>
    </Shell>
  );
}
