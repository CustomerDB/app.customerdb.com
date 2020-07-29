import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";

import Dataset from "./Dataset.js";
import DatasetDeleteModal from "./DatasetDeleteModal.js";
import DatasetEditModal from "./DatasetEditModal.js";
import ExploreHelp from "./ExploreHelp.js";
import DatasetHelp from "./DatasetHelp.js";

import { useParams } from "react-router-dom";
import WithFocus from "../util/WithFocus.js";

export default function Explore(props) {
  const auth = useContext(UserAuthContext);

  let { datasetsRef } = useFirestore();

  let { orgID, datasetID } = useParams();

  const [datasetList, setDatasetList] = useState(undefined);
  const [datasetMap, setDatasetMap] = useState(undefined);
  const [addModalShow, setAddModalShow] = useState();
  const [newDatasetRef, setNewDatasetRef] = useState();
  const [listTotal, setListTotal] = useState();

  useEffect(() => {
    if (!datasetsRef) {
      return;
    }

    let unsubscribe = datasetsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newDatasetList = [];
        let newDatasetMap = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newDatasetList.push(data);
          newDatasetMap[data.ID] = data;
        });

        setDatasetList(newDatasetList);
        setDatasetMap(newDatasetMap);
        setListTotal(snapshot.size);
      });
    return unsubscribe;
  }, [datasetsRef]);

  if (datasetList === undefined) {
    return <></>;
  }

  const options = (datasetID) => {
    if (!datasetID) {
      return <></>;
    }

    let datasetRef = datasetsRef.doc(datasetID);

    return (
      <Options key={datasetID}>
        <Options.Item
          name="Edit"
          modal={<DatasetEditModal datasetRef={datasetRef} />}
        />

        <Options.Item
          name="Delete"
          modal={<DatasetDeleteModal datasetRef={datasetRef} />}
        />
      </Options>
    );
  };

  let content;
  if (datasetID && datasetMap) {
    let dataset = datasetMap[datasetID];
    content = (
      <Dataset key={datasetID} dataset={dataset} options={options(datasetID)} />
    );
  } else if (listTotal > 0) {
    content = <DatasetHelp />;
  }

  let addModal = (
    <DatasetEditModal
      show={addModalShow}
      onHide={() => {
        setAddModalShow(false);
      }}
      datasetRef={newDatasetRef}
    />
  );

  let listItems = datasetList.map((dataset) => (
    <List.Item
      key={dataset.ID}
      name={dataset.name}
      path={`/orgs/${orgID}/explore/${dataset.ID}`}
      options={options(dataset.ID)}
    />
  ));

  return (
    <Page>
      <WithFocus>
        <List>
          <List.Title>
            <List.Name>Customer datasets</List.Name>
            <List.Add
              onClick={() => {
                datasetsRef
                  .add({
                    name: "Unnamed dataset",
                    documentIDs: [],
                    createdBy: auth.oauthClaims.email,
                    creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
                    deletionTimestamp: "",
                  })
                  .then((doc) => {
                    console.log("Should show modal");
                    setNewDatasetRef(doc);
                    setAddModalShow(true);
                  });
              }}
            />
            {addModal}
          </List.Title>
          <List.Items>
            <Scrollable>
              {listTotal > 0 ? listItems : <ExploreHelp />}
            </Scrollable>
          </List.Items>
        </List>
        {content}
      </WithFocus>
    </Page>
  );
}
