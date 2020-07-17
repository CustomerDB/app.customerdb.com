import React from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Table from "react-bootstrap/Table";
import ProgressBar from "react-bootstrap/ProgressBar";

import LeftNav from "./LeftNav.js";

import UploadForm from "./UploadForm.js";
import { now } from "./Utils.js";

var storageRef = window.firebase.storage().ref();

export default class Datasets extends React.Component {
  constructor(props) {
    super(props);

    this.datasetsRef = props.datasetsRef;
    this.user = props.user;

    this.handleFileUploadSubmit = this.handleFileUploadSubmit.bind(this);
    this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
    this.deleteDataset = this.deleteDataset.bind(this);

    this.state = {
      selectedFile: undefined,
      datasets: {},
    };
  }

  componentDidMount() {
    this.datasetsRef.onSnapshot(
      function (querySnapshot) {
        let datasets = {};
        querySnapshot.forEach(function (doc) {
          let dataset = doc.data();
          datasets[doc.id] = dataset;

          if (!datasets[doc.id].hasOwnProperty("googleStoragePath")) {
            datasets[doc.id]["state"] = <ProgressBar animated now={0} />;
          } else if (!datasets[doc.id].hasOwnProperty("processedAt")) {
            datasets[doc.id]["state"] = <ProgressBar animated now={100} />;
          }
          if (datasets[doc.id].hasOwnProperty("deletedAt")) {
            datasets[doc.id]["state"] = <ProgressBar animated now={100} />;
          } else {
            datasets[doc.id]["state"] = "";
          }
        });

        this.setState({ datasets: datasets });
      }.bind(this)
    );
  }

  handleFileUploadSubmit(e) {
    this.datasetsRef
      .add({
        name: this.state.selectedFile.name,
        owners: [this.user.ID],
      })
      .then(
        function (ref) {
          let id = ref.id;
          let storagePath = `csvs/${id}`;

          ref
            .set(
              {
                googleStoragePath: storagePath,
              },
              { merge: true }
            )
            .then(
              function () {
                let fileMetadata = {
                  customMetadata: {
                    datasetID: ref.id,
                  },
                };

                const uploadTask = storageRef
                  .child(storagePath)
                  .put(this.state.selectedFile, fileMetadata);

                uploadTask.on(
                  "state_changed",
                  (snapshot) => {
                    // Observe state change events such as progress, pause, and resume
                    var progress = Math.floor(
                      (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    );
                    let datasets = this.state.datasets;
                    datasets[ref.id]["state"] = <ProgressBar now={progress} />;
                    this.setState({
                      datasets: datasets,
                    });
                  },
                  (error) => {
                    // Handle unsuccessful uploads
                    console.error(error);
                    let datasets = this.state.datasets;
                    datasets[ref.id]["state"] = (
                      <Alert variant="danger">{error}</Alert>
                    );
                    this.setState({
                      datasets: datasets,
                    });
                  },
                  () => {
                    let datasets = this.state.datasets;
                    datasets[ref.id]["state"] = (
                      <ProgressBar animated now={100} />
                    );
                    this.setState({
                      datasets: datasets,
                    });
                  }
                );
              }.bind(this)
            );
        }.bind(this)
      );
  }

  handleFileUploadChange(e) {
    this.setState({ selectedFile: e.target.files[0] });
  }

  deleteDataset(datasetID) {
    this.datasetsRef.doc(datasetID).set(
      {
        deletedAt: now(),
      },
      { merge: true }
    );
  }

  render() {
    return (
      <div className="navContainer">
        <LeftNav active="datasets" />
        <div className="navBody">
          <div className="listContainer">
            <div className="listTitle">
              <div className="listTitleContainer">
                <h3>Patterns</h3>
              </div>
              {/* <UploadForm handleFileUploadChange={this.handleFileUploadChange} handleFileUploadSubmit={this.handleFileUploadSubmit}/> */}
            </div>
            <br />
            <DatasetCards
              datasets={this.state.datasets}
              deleteDataset={this.deleteDataset}
            />
          </div>
        </div>
      </div>
    );
  }
}

function DatasetCards(props) {
  let datasetRows = [];
  Object.entries(props.datasets).forEach((v) => {
    // let disabled = !(v[1].state === "");
    let datasetID = v[0];
    let dataset = v[1];

    // <Button disabled={disabled} variant="link" onClick={() => {props.deleteDataset(datasetID)}}>Delete</Button>{ }

    datasetRows.push(
      <div
        key={datasetID}
        className="listCard"
        onClick={() => {
          window.location.href = `/dataset/${datasetID}`;
        }}
      >
        <p className="listCardTitle">{dataset.name}</p>
        <p>{dataset.tags.length} tags</p>
        <p>{dataset.state}</p>
      </div>
    );
  });
  return <div>{datasetRows}</div>;
}
