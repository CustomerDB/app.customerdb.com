import React from 'react';
import { useState, useEffect } from 'react';

import {
    BrowserRouter as Router,
    Route,
    Routes,
    Navigate
} from "react-router-dom";

import Organization from './Organization.js';
import JoinOrg from './JoinOrg.js';
import Login from './Login.js';
import Error404 from './404.js';

import { Loading } from './Utils.js';

export default function App() {
    const [ oauthUser, setOauthUser] = useState(null);
    const [ oauthLoading, setOauthLoading ] = useState(true);

    useEffect(() => {
        const loginCallback = (user) => {
            setOauthUser(user);
            setOauthLoading(false);
        }

        window.firebase.auth().onAuthStateChanged(loginCallback);
    }, [oauthUser, oauthLoading]);

    if (oauthLoading) {
        return <Loading />;
    }

    return <Router>
        <Routes>
            <Route path="login" element={<Login oauthUser={oauthUser}/>} />
            <Route path="join">
                <Route path=":id" element={<JoinOrg oauthUser={oauthUser}/>} />
            </Route>
            <Route path="orgs">
                <Route path=":id/*" element={<Organization oauthUser={oauthUser}/>} />
            </Route>
            <Route path="/404">
                <Error404/>
            </Route>
            <Navigate to="/404" />
        </Routes>
    </Router>;
}