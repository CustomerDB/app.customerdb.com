import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { useState, useRef } from 'react';

import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Popover from 'react-bootstrap/Popover';
import Overlay from 'react-bootstrap/Overlay';
import Table from 'react-bootstrap/Table';
import ProgressBar from 'react-bootstrap/ProgressBar';

var provider = new window.firebase.auth.GoogleAuthProvider();
var storageRef = window.firebase.storage().ref();
var db = window.firebase.firestore();
// if (window.location.hostname === "localhost") {
//   db.settings({
//     host: "localhost:8080",
//     ssl: false
//   });
// }

function UploadForm(props) {
  const [show, setShow] = useState(false);
  const [target, setTarget] = useState(null);
  const ref = useRef(null);

  const handleClick = (event) => {
    setShow(!show);
    setTarget(event.target);
  };

  const handleHide = (event) => {
    setShow(!show);
  }

  return (
    <div ref={ref}>
      <Button onClick={handleClick}>Add dataset</Button>
      <Overlay
        show={show}
        target={target}
        placement="bottom"
        container={ref.current}
        rootClose={true}
        onHide={handleHide}
      >
        <Popover id="popover-contained">
          <Popover.Title as="h3">Add dataset</Popover.Title>
          <Popover.Content>
            <input type="file" className="file-select" accept=".csv" onChange={props.handleFileUploadChange}/>
            <br/>
            <br/>
            <Button onClick={() => {props.handleFileUploadSubmit(); handleHide();}}>Upload</Button>
          </Popover.Content>
        </Popover>
      </Overlay>
    </div>
  );
}

function DatasetTable(props) {
  let datasetRows = [];
  props.datasets.forEach((e) => {
    let disabled = !(e.state == "");
    datasetRows.push(<tr><td>{e.name}</td><td>{e.state}</td><td><Button disabled={disabled }variant="link">Delete</Button> <Button disabled={disabled}>Open</Button></td></tr>);
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


class App extends React.Component {
  constructor(props) {
    super(props);
    this.handleFileUploadSubmit = this.handleFileUploadSubmit.bind(this);
    this.handleFileUploadChange = this.handleFileUploadChange.bind(this);
    this.loginCallback = this.loginCallback.bind(this);
    this.login = this.login.bind(this);
    this.logoutCallback = this.logoutCallback.bind(this);
    this.logout = this.logout.bind(this);

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
        // // User is signed in.
        // var displayName = user.displayName;
        // var email = user.email;
        // var emailVerified = user.emailVerified;
        // var photoURL = user.photoURL;
        // var isAnonymous = user.isAnonymous;
        var uid = user.uid;
        // var providerData = user.providerData;

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

              console.log(datasets[doc.id]);

              if (!datasets[doc.id].hasOwnProperty('googleStoragePath')) {
                datasets[doc.id]['state'] = <p>Pending upload</p>;
              } else if (!datasets[doc.id].hasOwnProperty('processedAt')) {
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

          console.log("Login failed", error);
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
          console.log(error);
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

  logoutCallback() {
    // Sign-out successful.
    this.setState({'phase': 'login'});
    window.location.reload();
  }

  logout() {
    window.firebase.auth().signOut().then(this.logoutCallback).catch(function(error) {
      console.error(error);
    });
  }

  render() {
    if (this.state.phase == 'logging_in') {
      return  <div className="outerContainer"><div className="spinnerContainer"><Spinner animation="grow" /></div></div>;
    }

    if (this.state.phase == 'login') {
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
        <Button onClick={this.logout} variant="link">Logout</Button>
        <div className="outerContainer">
          <div className="uploadContainer">
            <h1>Highlight Group</h1>
            <UploadForm uploadStatus={this.state.uploadStatus} handleFileUploadChange={this.handleFileUploadChange} handleFileUploadSubmit={this.handleFileUploadSubmit}/>
            <br/>
            <DatasetTable datasets={Object.values(this.state.datasets)}/>
          </div>
        </div>
      </div>
      );
  }
}

export default App;
