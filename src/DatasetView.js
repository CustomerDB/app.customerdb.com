import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { logout, Loading } from './Utils.js';
import Board from './Board.js';

import Button from 'react-bootstrap/Button';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

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
                'dataset': doc.data()
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

        let tabs = [];
        this.state.dataset.tags.forEach((tag) => {
            tabs.push(<Tab key={tag} eventKey={tag} title={tag} className="fullHeight">
              <Board key={tag} datasetRef={this.dataset} tag={tag} />
            </Tab>);
        });

        return <>
            <div className="outerContainer fullHeight">
                <div className="datasetContainer">
                    <a href="/"><h4>Datasets</h4></a>
                    <h3>{this.state.dataset.name}</h3>
                    <br/>
                    <Tabs>
                        {tabs}
                    </Tabs>
                </div>
            </div>
        </>;
    }
}

export default withRouter(DatasetView);
