import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { logout, Loading } from './Utils.js';

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

        this.state = {
            isLoggedIn: false,
            isDataLoaded: false,
            datasetID: this.props.match.params.id,
            dataset: undefined
        }
    }

    componentDidMount() {
        window.firebase.auth().onAuthStateChanged(this.loginCallback);

        db.collection('datasets').doc(this.state.datasetID).onSnapshot((function(doc) {
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
        this.state.dataset.tags.forEach((e) => {
            tabs.push(<Tab eventKey={e} title={e}>
            </Tab>);
        });

        return <div>
            <Button onClick={logout} variant="link">Logout</Button>
            <div className="outerContainer">
                <div className="datasetContainer">
                    <a href="/"><h4>Datasets</h4></a>
                    <h3>{this.state.dataset.name}</h3>
                    <Tabs>
                        {tabs}
                    </Tabs>
                </div>
            </div>
        </div>;
    }
}

export default withRouter(DatasetView);