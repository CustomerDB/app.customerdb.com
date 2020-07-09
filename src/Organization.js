import React from 'react';
import { useEffect, useState } from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import Sources from './Sources.js';
import OrganizationHome from './OrganizationHome.js';
import Nav from './Nav.js';

import { logout } from './Utils.js';

import {
  Routes,
  Route,
  useParams,
  useNavigate
} from "react-router-dom";

import { Loading } from './Utils.js';

var db = window.firebase.firestore();

export default function Organization(props) {
  const [ user, setUser ] = useState(undefined);

  const navigate = useNavigate();

  const { id } = useParams();
  const orgID = id;
  const orgRef = db.collection("organizations").doc(orgID);
  const membersRef = orgRef.collection("members");
  const documentsRef = orgRef.collection("documents");

  useEffect(() => {
    const userRef =  membersRef.doc(props.oauthUser.email);
    let unsubscribe = userRef.onSnapshot(doc => {
      if (!doc.exists) {
        logout();
      }
      setUser(doc.data());
    }, error => {
      console.error(error);
      navigate('/404');
    });
    return unsubscribe;
  }, [orgID]);

  // useEffect(() => {
  //   let unsubscribe = orgRef.onSnapshot(doc => {
  //     if (!doc.exists) {
  //       navigate('/404');
  //     }
  //   });
  //   return unsubscribe;
  // }, [orgID]);

  // let datasetsRef = db.collection("datasets").where("owners", "array-contains", user.ID);
  // <Route path="/dataset/:id" children={<DatasetView user={this.state.user} />} />
  // <Route path="/datasets">
  // <Datasets datasetsRef={datasetsRef} user={this.state.user} logoutCallback={this.logout} />
  //
  //
  if (user === undefined) {
    return <Loading/>;
  }

  return <div className="navContainer">
    <Nav active="datasets"/>
    <div className="navBody">
      <Routes>
        <Route path="/" element={ <OrganizationHome orgID={orgID} user={user} orgRef={orgRef} />} />
        <Route path="sources">
          <Route path="/"  element={ <Sources orgID={orgID} documentsRef={documentsRef} user={user} /> } />
          <Route path=":documentID" element={ <Sources orgID={orgID} documentsRef={documentsRef} user={user} />} />
        </Route>
      </Routes>
    </div>
  </div>;
}
