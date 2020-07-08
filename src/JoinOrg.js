import React from 'react';
import { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { Loading } from './Utils.js';

import { useParams, useNavigate } from "react-router-dom";


var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function JoinOrg(props) {
    const [ phase, setPhase ] = useState('logging_in');
    const [ user, setUser ] = useState(undefined);
    const [ inviteFailed, setInviteFailed ] = useState(false);
    const [ reason, setReason ] = useState(undefined);

    let navigate = useNavigate();

    // Get invite id.
    let { id } = useParams();
    let orgID = id;

    const login = () => {
        window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(function() {
            window.firebase.auth().signInWithRedirect(provider);
        }).catch(function(error) {
            console.error(error);
        });
    };

    useEffect(() => {
        const loginCallback = (user) => {
            if (!user) {
                setPhase('login');
                setUser(undefined);
                return;
            }

            setUser(user);
            setPhase('join');
        };

        window.firebase.auth().onAuthStateChanged(loginCallback);
    }, []);

    const join = () => {
        setInviteFailed(false);
        setReason(undefined);

        // Get invite object.
        db.collection("orgs").doc(orgID).collection("members").doc(user.email).set({
            invited: false,
            active: true,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            // Success
            navigate(`/orgs/${orgID}`);
        }).catch(() => {
            //failed
            setPhase('join');
            setReason("Couldn't add you to the organization. Please reach out to your administrator and verify your email has been added.");
            setInviteFailed(true);
            return;
        });
    }

    const logout = () => {
        window.firebase.auth().signOut().catch(function(error) {
            console.error(error);
        });
    };

    if (phase === 'logging_in') {
        return Loading();
    }

    if (phase === 'login') {
        return <div className="outerContainer">
            <div className="loginContainer">
                <h2>CustomerDB</h2>
                <p>Log in to join organization</p>
                <br/>
                <Button onClick={login}>Login with Google</Button>
            </div>
        </div>;
    }

    if (phase === 'join') {
        let inviteFailedMessage;
        if (inviteFailed) {
            inviteFailedMessage = <Alert variant="danger">{reason}</Alert>;
        };

        return <div className="outerContainer">
            <div className="loginContainer">
            <h2>CustomerDB</h2>
            { inviteFailed ? inviteFailedMessage :
                <><p>Join organization with email {user.email} <Button onClick={logout} variant="link">Logout</Button></p>
                <br/>
                <Button onClick={join}>Join</Button></>}
            </div>
        </div>;
    }

    return <p>Activate</p>;
};