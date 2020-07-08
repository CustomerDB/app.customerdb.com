import React from 'react';
import { useEffect, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Documents from './Documents.js';
import Admin from './Admin.js';
import OrganizationHome from './OrganizationHome.js';
import LeftNav from './LeftNav.js';

import { logout } from './Utils.js';

// import Datasets from './Datasets.js'
// import DatasetView from './DatasetView.js'

import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useNavigate
} from "react-router-dom";

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function Organization(props) {
  const [ user, setUser ] = useState(undefined);
  const [ org, setOrg ] = useState(undefined);

  const { id } = useParams();
  const orgID = id;
  let orgRef = db.collection("organizations").doc(orgID);

  const navigate = useNavigate();

  useEffect(() => {
    if (props.oauthUser) {
      orgRef.get().then((doc) => {
        if (!doc.exists) {
          navigate("/404");
          return;
        }
  
        setOrg(doc.data());
      }).catch((e) => {
        // navigate("/404");
        console.debug(e);
        return;
      })

      let userRef = orgRef.collection("members").doc(props.oauthUser.email);

      // lookup user record
      userRef.get().then((doc => {
        if (doc.exists) {
          setUser(doc.data());
          return;
        }

        logout();
      }).bind(this))
      .catch((function (error) {
        logout();
      }));
    } else {
      navigate("/login");
    }
  }, [user, org]);

  // TODO(CD): scope reads in db rules instead
  let documentsRef = db.collection("documents");

  // let datasetsRef = db.collection("datasets").where("owners", "array-contains", user.ID);
  // <Route path="/dataset/:id" children={<DatasetView user={this.state.user} />} />
  // <Route path="/datasets">
  // <Datasets datasetsRef={datasetsRef} user={this.state.user} logoutCallback={this.logout} />

  return <div className="navContainer">
        <LeftNav active="datasets"/>
        <div className="navBody">
        <Routes>
          <Route path="/" element={ <OrganizationHome />} >
            <Route path="documents" element={<Documents documentsRef={documentsRef} user={user}/>}>
              <Route path=":id" children={<Documents documentsRef={documentsRef} user={user} />} />
            </Route>
            <Route path="admin" element={<Admin />} />
          </Route>      
        </Routes>
        </div>
      </div>;
}
