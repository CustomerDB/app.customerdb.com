import React from 'react';
import { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { Loading } from './Utils.js';

import { useParams } from "react-router-dom";


var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function JoinOrg(props) {
    const [ phase, setPhase ] = useState('logging_in');
    const [ user, setUser ] = userState(undefined);
    const [ inviteFailed, setInviteFailed ] = useState(false);
    const [ reason, setReason ] = useState(undefined);

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
                setInviteFailed(false);
                setReason(undefined);
                setUser(undefined);
                return;
            }

            setUser(user);
        };

        window.firebase.auth().onAuthStateChanged(loginCallback);
    }, [orgID]);

    const join = () => {
        // Get invite object.
        db.collection("orgs").doc(orgID).collection("members").doc(user.email).set({
            invited: false,
            active: true,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            // Success
            console.log(`Success. Added ${user.email} to organization`);
        }).catch(() => {
            //failed
            setPhase('login');
            setReason("Couldn't add you to the organization. Please reach out to your administrator and verify your email has been added.");
            setInviteFailed(true);
            return;
        });
    }

    if (phase === 'logging_in') {
        return Loading();
    }

    if (phase === 'login') {
        let inviteFailedMessage;
        if (inviteFailed) {
            inviteFailedMessage = <Alert variant="danger">{reason}</Alert>;
        };

        let loginForm = <>
            <p>Log in to activate invite</p>
            <br/>
            <Button onClick={login}>Login with Google</Button></>;

        return <div className="outerContainer">
            <div className="loginContainer">
                <h2>CustomerDB</h2>
                { inviteFailed ? inviteFailedMessage : loginForm}
            </div>
        </div>;
    }

    return <p>Activate</p>;
};