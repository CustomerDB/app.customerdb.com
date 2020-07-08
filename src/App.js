import React from 'react';

import {
    BrowserRouter as Router,
    Switch,
    Route,
    Routes,
    Navigate
} from "react-router-dom";

import SecuredContent from './SecuredContent.js';
import ActivateInvite from './ActivateInvite.js';
import Error404 from './404.js';

export default function App() {
    console.log("App is rendering");

    return <Router>
        <Routes>
            <Route path="/activate/:id" element={<ActivateInvite />} />
            <Route path="/404">
                <Error404/>
            </Route>
            <Route path="org">
                <Route path=":id/*" element={<SecuredContent />} />
            </Route>
            <Navigate to="/404" />
        </Routes>
    </Router>;
}