import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';

var provider = new window.firebase.auth.GoogleAuthProvider();
var storageRef = window.firebase.storage().ref();

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
      'uploadStatus': undefined
    };
  }

  componentDidMount() {
    window.firebase.auth().onAuthStateChanged(this.loginCallback);
  }

  loginCallback(user) {
      if (user) {
        // User is signed in.
        var displayName = user.displayName;
        var email = user.email;
        var emailVerified = user.emailVerified;
        var photoURL = user.photoURL;
        var isAnonymous = user.isAnonymous;
        var uid = user.uid;
        var providerData = user.providerData;
        console.log("User is signed in! " + displayName);
        this.setState({'phase': 'logged_in'});
      } else {
        console.log("User is signed out");
        this.setState({'phase': 'login'});
      }
  }

  handleFileUploadSubmit(e) {
    this.setState({'uploadStatus': 'Uploading..'});
    const uploadTask = storageRef.child(`csvs/${this.state.selectedFile.name}`).put(this.state.selectedFile); //create a child directory called images, and place the file inside this directory
    uploadTask.on('state_changed', (snapshot) => {
    // Observe state change events such as progress, pause, and resume
    }, (error) => {
      // Handle unsuccessful uploads
      console.log(error);
      this.setState({'uploadStatus': error});
    }, () => {
       // Do something once upload is complete
       console.log('success');
       this.setState({'uploadStatus': 'Uploaded file successfully'});
    });
  }

  handleFileUploadChange(e) {
    this.setState({'selectedFile': e.target.files[0]});
  }

  uploadForm() {
    let status;
    if (this.state.uploadStatus != undefined) {
      status = <p>{this.state.uploadStatus}</p>;
    }

    return <div id="filesubmit">
      {status}
      <input type="file" class="file-select" accept=".csv" onChange={this.handleFileUploadChange}/>
      <Button onClick={this.handleFileUploadSubmit}>Upload</Button>
    </div>;
  }

  login() {
    window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL).then(function() {
      window.firebase.auth().signInWithRedirect(provider);
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
    });
  }

  logoutCallback() {
    // Sign-out successful.
    this.setState({'phase': 'login'})
  }

  logout() {
    window.firebase.auth().signOut().then(this.logoutCallback).catch(function(error) {
      // An error happened.
    });
  }

  render() {
    if (this.state.phase == 'logging_in') {
      return  <div className="outerContainer"><div className="spinnerContainer"><Spinner animation="grow" /></div></div>;
    }

    if (this.state.phase == 'login') {
      return <div className="outerContainer"><div className="loginContainer">
        <h4>Group Highlights</h4>
        <br/>
        <Button onClick={this.login}>Login with Google</Button>
      </div></div>;
    }

    return (
      <div>
        <h1>Quantap App</h1>
        {this.uploadForm()}
        <Button onClick={this.logout}>Logout</Button>
      </div>
      );
  }
}

export default App;
