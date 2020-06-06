import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import ProgressBar from 'react-bootstrap/ProgressBar';

import DatasetTable from './DatasetTable.js';
import UploadForm from './UploadForm.js';
import DatasetView from './DatasetView.js'
import { now, logout, Loading } from './Utils.js';


import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

var provider = new window.firebase.auth.GoogleAuthProvider();
var storageRef = window.firebase.storage().ref();
var db = window.firebase.firestore();

function App() {
  return <div>
    <Router>
      <Switch>
      <Route exact path="/">
        <Home />
      </Route>
      <Route exact path="/dataset/:id" children={<DatasetView />} />
    </Switch>
  </Router></div>;
}

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.handleFileUploadSubmit = this.handleFileUploadSubmit.bind(this);
    this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
    this.loginCallback = this.loginCallback.bind(this);
    this.login = this.login.bind(this);
    this.deleteDataset = this.deleteDataset.bind(this);

    this.state = {
      'selectedFile': undefined,
      'phase': 'logging_in',
      'user': undefined,
      'uploadStatus': undefined,
      'loginFailed': false,
      'datasets': {}
    };
  }

  componentDidMount() {
    window.firebase.auth().onAuthStateChanged(this.loginCallback);
  }

  loginCallback(user) {
      if (user) {
        var uid = user.uid;

        // write document to users collection
        var userRef = db.collection("users").doc(uid);
        userRef.set(
          {
            email: user.email
          },
          { merge: true }
        )
        .then((function() {
          this.setState({
            'phase': 'logged_in',
            'user': user
          });

          db.collection("datasets").where("owners", "array-contains", this.state.user.uid)
          .onSnapshot((function(querySnapshot) {
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

        }).bind(this))
        .catch((function (error) {
          window.firebase.auth().signOut().catch(function(error) {
            console.error(error);
          });

          console.error("Login failed", error);
          this.setState({
            'phase': 'login',
            'user': undefined,
            'loginFailed': true
          });
        }).bind(this));

      } else {
        this.setState({'phase': 'login', 'user': undefined});
      }
  }

  handleFileUploadSubmit(e) {
    this.setState({'uploadStatus': {'status': 'light', 'message': 'Uploading..'}});

    db.collection("datasets").add({
      name: this.state.selectedFile.name,
      owners: [this.state.user.uid]
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

  login() {
    window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).then(function() {
      window.firebase.auth().signInWithRedirect(provider);
    }).catch(function(error) {
      console.error(error);
    });
  }

  deleteDataset(datasetID) {
    db.collection('datasets').doc(datasetID).set({
      deletedAt: now()
    }, {merge: true});
  }

  render() {
    if (this.state.phase === 'logging_in') {
      return Loading();
    }

    if (this.state.phase === 'login') {
      let loginFailedMessage = this.state.loginFailed ? <Alert variant="danger">Login failed</Alert> : <div></div>;
      return <div className="outerContainer"><div className="loginContainer">
        <h4>Group Highlights</h4>
        <br/>
        {loginFailedMessage}
        <Button onClick={this.login}>Login with Google</Button>
      </div></div>;
    }

    return (
      <div>
        <Button onClick={logout} variant="link">Logout</Button>
        <div className="outerContainer">
          <div className="uploadContainer">
            <div className="uploadTitle">
              <div className="uploadTitleContainer">
                <h3>Datasets</h3>
              </div>
              <UploadForm uploadStatus={this.state.uploadStatus} handleFileUploadChange={this.handleFileUploadChange} handleFileUploadSubmit={this.handleFileUploadSubmit}/>
            </div>
            <br/>
            <DatasetTable datasets={this.state.datasets} deleteDataset={this.deleteDataset}/>
          </div>
        </div>
      </div>
      );
  }
}

export default App;
