import React from 'react';
import { useEffect, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import Documents from './Documents.js';
// import Datasets from './Datasets.js'
// import DatasetView from './DatasetView.js'
import { Loading } from './Utils.js';

import {
  BrowserRouter as Router,
  Routes,
  Route
} from "react-router-dom";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function SecuredContent(props) {
  const [ phase, setPhase ] = useState('logging_in');
  const [ user, setUser ] = useState(undefined);
  const [ loginSuccess, setLoginSuccess ] = useState(false);

  const login = () => {
    window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(function() {
      window.firebase.auth().signInWithRedirect(provider);
    }).catch(function(error) {
      console.error(error);
    });
  }

  const logout = () => {
    window.firebase.auth().signOut().catch(function(error) {
        console.error(error);
    });
  };

  useEffect(() => {
    const loginCallback = (user) => {
      console.debug("loginCallback", user);
  
        if (user) {
          let uid = user.uid;
          let userRef = db.collection("users").doc(uid);
  
          // lookup user record
          userRef.get().then((doc => {
            if (doc.exists) {
              setPhase('logged_in');
              setUser(doc.data());
              return;
            }
  
            window.firebase.auth().signOut();
          }).bind(this))
          .catch((function (error) {
            window.firebase.auth().signOut();
          }));
        } else {
          setPhase('login');
          setUser(undefined);
        }
    }

    window.firebase.auth().onAuthStateChanged(loginCallback);
  }, []);

  if (phase === 'logging_in') {
    return Loading();
  }

  if (phase === 'login') {
      let loginFailedMessage = !loginSuccess ? <Alert variant="danger">Login failed</Alert> : <div></div>;
      return <div className="outerContainer"><div className="loginContainer">
          <h2>CustomerDB</h2>
          <br/>
          {loginFailedMessage}
          <Button onClick={login}>Login with Google</Button>
      </div></div>;
  }

  // TODO(CD): scope reads in db rules instead
  let documentsRef = db.collection("documents");

  console.log("secured content renders");

  // let datasetsRef = db.collection("datasets").where("owners", "array-contains", user.ID);
  // <Route path="/dataset/:id" children={<DatasetView user={this.state.user} />} />
  // <Route path="/datasets">
  // <Datasets datasetsRef={datasetsRef} user={this.state.user} logoutCallback={this.logout} />

  return <Routes>
    <Route path="/">
      <Route path="documents" element={<Documents documentsRef={documentsRef} user={user} logoutCallback={logout} />}>
        <Route path=":id" children={<Documents documentsRef={documentsRef} user={user} logoutCallback={logout} />} />
      </Route>
    </Route>      
  </Routes>;
}
