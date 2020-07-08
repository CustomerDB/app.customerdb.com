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
  Routes,
  Route,
  useParams,
  useNavigate
} from "react-router-dom";

var db = window.firebase.firestore();

export default function Organization(props) {
  const [ user, setUser ] = useState(undefined);
  const [ org, setOrg ] = useState(undefined);

  const { id } = useParams();
  const orgID = id;
  const orgRef = db.collection("organizations").doc(orgID);
  const membersRef = orgRef.collection("members");
  const documentsRef = orgRef.collection("documents");

  const navigate = useNavigate();

  useEffect(() => {
    const userRef =  membersRef.doc(props.oauthUser.email);
    let unsubscribe = userRef.onSnapshot(doc => {
      if (!doc.exists) {
        logout();
      }
      setUser(doc.data());
    });
    return unsubscribe;
  }, [user]);

  // let datasetsRef = db.collection("datasets").where("owners", "array-contains", user.ID);
  // <Route path="/dataset/:id" children={<DatasetView user={this.state.user} />} />
  // <Route path="/datasets">
  // <Datasets datasetsRef={datasetsRef} user={this.state.user} logoutCallback={this.logout} />
  //
  //

  return <div className="navContainer">
    <LeftNav active="datasets"/>
    <div className="navBody">
    <Routes>
      <Route path="/" element={ <OrganizationHome orgRef={orgRef} />} />
      <Route path="sources" element={ <Documents documentsRef={documentsRef} user={user} />} />
    </Routes>
    </div>
  </div>;
}
