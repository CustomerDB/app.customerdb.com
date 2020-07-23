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
  let navigate = useNavigate();

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

  // useEffect(() => {
  //   if (!datasetID || datasetID === "" || !datasets) {
  //     setDataset(undefined);
  //     setDatasetRef(undefined);
  //     return;
  //   }

  //   let newDataset = datasets.find((ds) => ds.ID === datasetID);
  //   if (newDataset === undefined) {
  //     navigate("/404");
  //     return;
  //   }

  //   setDataset(newDataset);
  //   setDatasetRef(props.datasetsRef.doc(newDataset.ID));
  // }, [datasetID, datasets]);

  // const onAdd = () => {
  //   props.datasetsRef.add({
  //     name: "New dataset",
  //     createdBy: auth.oauthClaims.email,
  //     creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
  //     documentIDs: [],

  //     // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
  //     // we don't show the document anymore in the list. However, it should be
  //     // possible to recover the document by unsetting this field before
  //     // the deletion grace period expires and the GC sweep does a permanent delete.
  //     deletionTimestamp: "",
  //   });
  // };

  // const onClick = (ID) => {
  //   navigate(`/orgs/${orgID}/explore/${ID}`);
  // };

  // const itemLoad = (index) => {
  //   return datasets[index];
  // };

  // const onRename = (ID, newName) => {
  //   props.datasetsRef.doc(ID).set(
  //     {
  //       name: newName,
  //     },
  //     { merge: true }
  //   );
  // };

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

  // return (
  //   <>
  //     <Container className="noMargin">
  //       <Row className="h-100">
  //         <Col md={4} className="d-flex flex-column h-100">
  //           <List
  //             name="Customer Datasets"
  //             currentID={datasetID}
  //             itemLoad={itemLoad}
  //             itemCount={datasets.length}
  //             onAdd={onAdd}
  //             options={options}
  //             onClick={onClick}
  //           />
  //         </Col>
  //         <Col md={8} className="d-flex flex-column h-100">
  //           {view}
  //         </Col>
  //       </Row>
  //     </Container>

  //     <RenameModal
  //       show={showRenameModal}
  //       dataset={modalDataset}
  //       onRename={onRename}
  //       onHide={() => {
  //         setShowRenameModal(false);
  //       }}
  //     />
  //     <DeleteModal
  //       show={showDeleteModal}
  //       dataset={modalDataset}
  //       onDelete={onDelete}
  //       onHide={() => {
  //         setShowDeleteModal(false);
  //       }}
  //     />
  //   </>
  // );
}

// function RenameModal(props) {
//   const [name, setName] = useState();

//   useEffect(() => {
//     if (props.dataset !== undefined) {
//       setName(props.dataset.name);
//     }
//   }, [props.dataset]);

//   const onSubmit = () => {
//     props.onRename(props.dataset.ID, name);
//     props.onHide();
//   };

//   return (
//     <Modal show={props.show} onHide={props.onHide} centered>
//       <Modal.Header closeButton>
//         <Modal.Title>Rename dataset</Modal.Title>
//       </Modal.Header>
//       <Modal.Body>
//         <Form.Control
//           type="text"
//           value={name}
//           onChange={(e) => {
//             setName(e.target.value);
//           }}
//           onKeyDown={(e) => {
//             if (e.key === "Enter") {
//               onSubmit();
//             }
//           }}
//         />
//       </Modal.Body>
//       <Modal.Footer>
//         <Button variant="primary" onClick={onSubmit}>
//           Rename
//         </Button>
//       </Modal.Footer>
//     </Modal>
//   );
// }

// function DeleteModal(props) {
//   const [name, setName] = useState();

//   useEffect(() => {
//     if (props.dataset !== undefined) {
//       setName(props.dataset.name);
//     }
//   }, [props.dataset]);

//   return (
//     <Modal show={props.show} onHide={props.onHide} centered>
//       <Modal.Header closeButton>
//         <Modal.Title>Delete dataset</Modal.Title>
//       </Modal.Header>
//       <Modal.Body>Are you sure you want to delete {name}?</Modal.Body>
//       <Modal.Footer>
//         <Button
//           variant="danger"
//           onClick={() => {
//             props.onDelete(props.dataset.ID);
//             props.onHide();
//           }}
//         >
//           Delete
//         </Button>
//       </Modal.Footer>
//     </Modal>
//   );
// }
