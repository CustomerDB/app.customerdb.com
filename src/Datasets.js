import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import ProgressBar from 'react-bootstrap/ProgressBar';

import LeftNav from './LeftNav.js';

import UploadForm from './UploadForm.js';
import { now } from './Utils.js';

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
      'selectedFile': undefined,
      'datasets': {}
    };
  }

  componentDidMount() {
    this.datasetsRef.onSnapshot((function(querySnapshot) {
      let datasets = {};
      querySnapshot.forEach(function(doc) {
        let dataset = doc.data();
        datasets[doc.id] = dataset;

        if (!datasets[doc.id].hasOwnProperty('googleStoragePath')) {
          datasets[doc.id]['state'] = <ProgressBar animated now={0} />;
        } else if (!datasets[doc.id].hasOwnProperty('processedAt')) {
          datasets[doc.id]['state'] = <ProgressBar animated now={100} />;
        } if (datasets[doc.id].hasOwnProperty('deletedAt')) {
          datasets[doc.id]['state'] = <ProgressBar animated now={100} />;
        } else {
          datasets[doc.id]['state'] = "";
        }
      });

      this.setState({'datasets': datasets});
    }).bind(this));
  }

  handleFileUploadSubmit(e) {
    this.datasetsRef.add({
      name: this.state.selectedFile.name,
      owners: [this.user.uid]
    }).then((function(ref) {
      let id = ref.id
      let storagePath = `csvs/${id}`;

      ref.set({
        googleStoragePath: storagePath
      }, {merge: true}).then((function() {
        let fileMetadata = {
          customMetadata: {
            datasetID: ref.id
          }
        };

        const uploadTask = storageRef.child(storagePath).put(
          this.state.selectedFile,
          fileMetadata
        );

        uploadTask.on('state_changed', (snapshot) => {
          // Observe state change events such as progress, pause, and resume
          var progress = Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          let datasets = this.state.datasets;
          datasets[ref.id]['state'] = <ProgressBar now={progress} />;
          this.setState({
            datasets: datasets
          })
        }, (error) => {
          // Handle unsuccessful uploads
          console.error(error);
          let datasets = this.state.datasets;
          datasets[ref.id]['state'] = <Alert variant="danger">{error}</Alert>;
          this.setState({
            datasets: datasets
          });
        }, () => {
          let datasets = this.state.datasets;
          datasets[ref.id]['state'] = <ProgressBar animated now={100} />;
          this.setState({
            datasets: datasets
          });
       });
      }).bind(this))
    }).bind(this));
  }

  handleFileUploadChange(e) {
    this.setState({'selectedFile': e.target.files[0]});
  }

  deleteDataset(datasetID) {
    this.datasetsRef.doc(datasetID).set({
      deletedAt: now()
    }, {merge: true});
  }

  render() {
    return (
      <div className="navContainer">
        <LeftNav logoutCallback={this.props.logoutCallback}/>
        <div className="navBody">
          <div className="outerContainer">
            <div className="uploadContainer">
              <div className="uploadTitle">
                <div className="uploadTitleContainer">
                  <h3>Datasets</h3>
                </div>
                <UploadForm handleFileUploadChange={this.handleFileUploadChange} handleFileUploadSubmit={this.handleFileUploadSubmit}/>
              </div>
              <br/>
              <DatasetTable datasets={this.state.datasets} deleteDataset={this.deleteDataset}/>
            </div>
          </div>
        </div>
      </div>
      );
  }
}

function DatasetTable(props) {
  let datasetRows = [];
  Object.entries(props.datasets).forEach((v) => {
    let disabled = !(v[1].state === "");
    let datasetID = v[0];
    let dataset = v[1];

    datasetRows.push(<tr key={datasetID}>
      <td>{dataset.name}</td>
      <td>{dataset.state}</td>
      <td style={{textAlign: 'right'}}>
        <Button disabled={disabled} variant="link" onClick={() => {props.deleteDataset(datasetID)}}>Delete</Button>{ }
        <Button disabled={disabled} onClick={() => {window.location.href=`/dataset/${datasetID}`}}>Open</Button>
      </td>
    </tr>);
  });
  return <Table>
  <thead>
    <tr>
      <th>Name</th>
      <th style={{width: "15rem"}}>{ }</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    {datasetRows}
  </tbody>
  </Table>;
}
