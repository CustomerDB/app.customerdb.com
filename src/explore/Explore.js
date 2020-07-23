import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import Page from "../shell/Page.js";
import List from "../shell/List.js";
import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";
import Options from "../shell/Options.js";

import Dataset from "./Dataset.js";
import DatasetDeleteModal from "./DatasetDeleteModal.js";
import DatasetEditModal from "./DatasetEditModal.js";

import { useNavigate, useParams } from "react-router-dom";

export default function Explore(props) {
  const auth = useContext(UserAuthContext);

  let { orgID, datasetID } = useParams();

  const [datasetList, setDatasetList] = useState(undefined);
  const [datasetMap, setDatasetMap] = useState(undefined);
  const [addModalShow, setAddModalShow] = useState();
  const [newDatasetRef, setNewDatasetRef] = useState();

  useEffect(() => {
    let unsubscribe = props.datasetsRef
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
      });
    return unsubscribe;
  }, []);

  if (datasetList === undefined) {
    return <></>;
  }

  const options = (datasetID) => {
    if (!datasetID) {
      return <></>;
    }

    let datasetRef = props.datasetsRef.doc(datasetID);

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
  if (datasetID && datasetMap && props.datasetsRef) {
    let datasetRef = props.datasetsRef.doc(datasetID);
    let dataset = datasetMap[datasetID];
    content = (
      <Dataset
        key={datasetID}
        dataset={dataset}
        datasetRef={datasetRef}
        documentsRef={props.documentsRef}
        allHighlightsRef={props.allHighlightsRef}
        options={options}
      />
    );
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

  return (
    <Page>
      <List>
        <List.Title>
          <List.Name>Customer datasets</List.Name>
          <List.Add
            onClick={() => {
              props.datasetsRef
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
            {datasetList.map((dataset) => (
              <List.Item
                key={dataset.ID}
                name={dataset.name}
                path={`/orgs/${orgID}/explore/${dataset.ID}`}
                options={options(dataset.ID)}
              />
            ))}
          </Scrollable>
        </List.Items>
      </List>
      <Content>{content}</Content>
    </Page>
  );
}
