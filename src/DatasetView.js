import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { logout, Loading } from './Utils.js';
import Board from './Board.js';

import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Nav from 'react-bootstrap/Nav';


import {
  withRouter
} from "react-router-dom";

var db = window.firebase.firestore();

class DatasetView extends React.Component {
  constructor(props) {
    super(props);

    this.loginCallback = this.loginCallback.bind(this);

    this.datasetID = this.props.match.params.id;

    this.dataset = db.collection('datasets').doc(this.datasetID);

    // NOTE: boards and datasets are in 1:1 correspondence
    //       but that will likely change in the future.
    this.board = db.collection('boards').doc(this.datasetID);

    this.state = {
      isLoggedIn: false,
      isDataLoaded: false,
      dataset: undefined
    }
  }

  componentDidMount() {
    window.firebase.auth().onAuthStateChanged(this.loginCallback);

    this.dataset.onSnapshot((function(doc) {
      this.setState({
        isDataLoaded: true,
        'dataset': doc.data(),
        'selectedTag': doc.data().tags[0]
      });
    }).bind(this));

  }

  loginCallback(user) {
    if (user) {
      console.log(user);
      this.setState({
        isLoggedIn: true,
        user: user
      });
    } else {
      window.location.href = '/';
    }
  }

  render() {
    if (!(this.state.isLoggedIn && this.state.isDataLoaded)) {
      return Loading();
    }

    let dropdownItems = [];
    this.state.dataset.tags.forEach((tag) => {
      // Build drop down
      dropdownItems.push(<NavDropdown.Item  key={tag} onClick={(e) => {this.setState({'selectedTag': tag})}}>{tag}</NavDropdown.Item>)
    });
    return <>
      <Navbar bg="light" expand="lg" fixed="top">
        <Nav.Link href="/">Datasets</Nav.Link>
        <Nav.Item>{this.state.dataset.name}</Nav.Item>
        <NavDropdown title={this.state.selectedTag} id="collasible-nav-dropdown">
          {dropdownItems}
        </NavDropdown>
        <Navbar.Collapse className="justify-content-end">
          <Nav.Link onClick={() => {logout()}}>Logout</Nav.Link>
        </Navbar.Collapse>
      </Navbar>
      <div className="outerContainer fullHeight">
        <div className="datasetContainer">
          <Board user={this.state.user} key={this.state.selectedTag} boardRef={this.board} datasetRef={this.dataset} tag={this.state.selectedTag} />
        </div>
      </div>
      </>;
  }
}

export default withRouter(DatasetView);
