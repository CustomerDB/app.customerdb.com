import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';

var provider = new window.firebase.auth.GoogleAuthProvider();
var storageRef = window.firebase.storage().ref();
var db = window.firebase.firestore();
if (window.location.hostname === "localhost") {
  db.settings({
    host: "localhost:8080",
    ssl: false
  });
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
      'loginFailed': false
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
        }).bind(this))
        .catch((function (error) {
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
    const uploadTask = storageRef.child(`csvs/${this.state.selectedFile.name}`).put(this.state.selectedFile);
    uploadTask.on('state_changed', (snapshot) => {
    // Observe state change events such as progress, pause, and resume
    }, (error) => {
      // Handle unsuccessful uploads
      console.log(error);
      this.setState({'uploadStatus': {'status': 'danger', 'message': error}});
    }, () => {
       // Do something once upload is complete
       console.log('success');
       this.setState({'uploadStatus': {'status': 'success', 'message': 'Uploaded file successfully'}});
    });
  }

  handleFileUploadChange(e) {
    this.setState({'selectedFile': e.target.files[0]});
  }

  uploadForm() {
    let status;
    if (this.state.uploadStatus != undefined) {
      status = <Alert variant={this.state.uploadStatus.status}>{this.state.uploadStatus.message}</Alert>;
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
      let loginFailedMessage = this.state.loginFailed ? <div>FAIL</div> : <div></div>;
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
            {this.uploadForm()}
          </div>
        </div>
      </div>
      );
  }
}

export default App;
