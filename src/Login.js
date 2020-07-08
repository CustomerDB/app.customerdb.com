import React from 'react';
import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function Login(props) {
    const navigate = useNavigate();
    const [ loginSuccess, setLoginSuccess ] = useState(undefined);

    const login = () => {
        window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(function() {
            window.firebase.auth().signInWithRedirect(provider);
        });
    }

    useEffect(() => {
        if (props.oauthUser !== null) {
            db.collection("userToOrg").doc(props.oauthUser.email).get().then((doc) => {
                if (!doc.exists) {
                    // Couldn't find your org.
                    setLoginSuccess(false);
                    return;
                }

                let userToOrg = doc.data();
                navigate(`/orgs/${userToOrg.orgID}`);
                return <></>;
            })
        }
    }, []);

    let loginFailedMessage = (loginSuccess === false) ? <Alert variant="danger">Login failed</Alert> : <div></div>;
    return <div className="outerContainer"><div className="loginContainer">
        <h2>CustomerDB</h2>
        <br/>
        {loginFailedMessage}
        <Button onClick={login}>Login with Google</Button>
    </div></div>;
}