import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import Documents from './Documents.js';
import Document from './Document.js';
import Datasets from './Datasets.js'
import DatasetView from './DatasetView.js'
import { Loading } from './Utils.js';


import {
  BrowserRouter as Router,
  Switch,
  Route
} from "react-router-dom";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default class App extends React.Component {
  constructor(props) {
    super(props);

    this.loginCallback = this.loginCallback.bind(this);

    this.state = {
      'phase': 'logging_in',
      'user': undefined,
      'loginFailed': false
    };
  }

  componentDidMount() {
    window.firebase.auth().onAuthStateChanged(this.loginCallback);
  }

  login() {
    window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(function() {
      window.firebase.auth().signInWithRedirect(provider);
    }).catch(function(error) {
      console.error(error);
    });
  }

  logout() {
    window.firebase.auth().signOut().catch(function(error) {
        console.error(error);
    });
  };

  loginCallback(user) {
    console.debug("loginCallback", user);

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

        }).bind(this))
        .catch((function (error) {
          window.firebase.auth().signOut().catch(function(error) {
            console.error(error);
          });
        }));

      } else {
        this.setState({'phase': 'login', 'user': undefined});
      }
  }

  render() {
    if (this.state.phase === 'logging_in') {
      return Loading();
    }

    if (this.state.phase === 'login') {
      let loginFailedMessage = this.state.loginFailed ? <Alert variant="danger">Login failed</Alert> : <div></div>;
      return <div className="outerContainer"><div className="loginContainer">
        <h2>Customer Research Cloud</h2>
        <br/>
        {loginFailedMessage}
        <Button onClick={this.login}>Login with Google</Button>
      </div></div>;
    }

    // TODO(CD): scope reads in db rules instead
    let datasetsRef = db.collection("datasets").where("owners", "array-contains", this.state.user.uid);
    let documentsRef = db.collection("documents").where("owners", "array-contains", this.state.user.uid);

    return <>
      <Router>
        <Switch>
        <Route exact path="/">
          <Datasets datasetsRef={datasetsRef} user={this.state.user} logoutCallback={this.logout} />
        </Route>
        <Route exact path="/dataset/:id" children={<DatasetView user={this.state.user} />} />
        <Route exact path="/documents">
          <Documents documentsRef={documentsRef} logoutCallback={this.logout} />
        </Route>
        <Route exact path="/document/:id" children={<Document logoutCallback={this.logout} />} />
      </Switch>
    </Router></>;
  }
}
