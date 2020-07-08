import React from 'react';
import { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { Loading } from './Utils.js';

import { useParams } from "react-router-dom";


var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

export default function ActivateInvite(props) {
    const [ phase, setPhase ] = useState('logging_in');
    const [ inviteFailed, setInviteFailed ] = useState(false);
    const [ reason, setReason ] = useState(undefined);

    // Get invite id.
    let { id } = useParams();
    let inviteID = id;

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
                return;
            }

            console.debug("Logged in", user);
            console.debug("inviteID", inviteID);

            // Get invite object.
            db.collection("invites").doc(inviteID).get().then((doc) => {
                if (!doc.exists) {
                    window.location.assign("/404");
                    return;
                }

                let invite = doc.data();
                console.debug("invite:", invite)
                console.debug("user.uid", user.uid);

                let userRef = db.collection("users").doc(user.uid);
                userRef.get().then((doc) => {
                    if (doc.exists) {
                        // Need to add organization from invite to a user.

                        let dbUser = doc.data();
                        let organizationIDs = dbUser.organizationIDs;

                        if (organizationIDs.includes(inviteID)) {
                            window.location.assign("/");
                            return;
                        }

                        organizationIDs.push(invite.organizationID);
                        userRef.set( {
                            inviteID: inviteID,
                            organizationIDs: organizationIDs
                        }, {merge: true}).then(() => {
                            // Activation succeeded.
                            window.location.assign("/");
                            return;
                        }).catch((e) => {
                            setPhase('login');
                            setReason("Failed to add organization to user");
                            setInviteFailed(true);
                            window.firebase.auth().signOut();
                            return;
                        })
                    }

                    // Need to create a user with this organization.
                    userRef.set( {
                        ID: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        inviteID: inviteID,
                        organizationIDs: [invite.organizationID]
                    }).then(() => {
                        // Activation succeeded.
                        window.location.assign("/");
                        return;
                    }).catch((e) => {
                        setPhase('login');
                        setReason("Failed to create user");
                        setInviteFailed(true);
                        window.firebase.auth().signOut();
                        return;
                    })
                })
            }).catch((e) => {
                console.debug('debug', e);
                setPhase('login');
                setReason("Invite doesn't exist");
                setInviteFailed(true);
                window.firebase.auth().signOut();
                return;
            })
        };

        window.firebase.auth().onAuthStateChanged(loginCallback);
    }, [inviteID]);

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