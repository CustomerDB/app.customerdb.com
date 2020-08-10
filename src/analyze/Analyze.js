import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";

import Analysis from "./Analysis.js";
import AnalysisDeleteModal from "./AnalysisDeleteModal.js";
import AnalysisRenameModal from "./AnalysisRenameModal.js";
import AnalyzeHelp from "./AnalyzeHelp.js";
import AnalysisHelp from "./AnalysisHelp.js";

import { useParams } from "react-router-dom";
import WithFocus from "../util/WithFocus.js";

export default function Analyze(props) {
  const { oauthClaims } = useContext(UserAuthContext);

  let { analysesRef } = useFirestore();

  let { orgID, analysisID } = useParams();

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
    <List.Item
      key={analysis.ID}
      name={analysis.name}
      path={`/orgs/${orgID}/analyze/${analysis.ID}`}
    />
  ));

  return (
    <Page>
      <WithFocus>
        <List>
          <List.Title>
            <List.Name>Customer Analysis</List.Name>
            <List.Add
              onClick={() => {
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
              }}
            />
            {addModal}
          </List.Title>
          <List.Items>
            <Scrollable>
              {listTotal > 0 ? listItems : <AnalyzeHelp />}
            </Scrollable>
          </List.Items>
        </List>
        {content}
      </WithFocus>
    </Page>
  );
}
