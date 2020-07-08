import React from 'react';

import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

import { Loading } from './Utils.js';

import { useParams } from "react-router-dom";


var provider = new window.firebase.auth.GoogleAuthProvider();
var db = window.firebase.firestore();

class ActivateInvite extends React.Component {
    constructor(props) {
        super(props);

        this.loginCallback = this.loginCallback.bind(this);

        this.state = {
          phase: 'logging_in',
          user: undefined,
          loginSuccess: false
        };
    }

    login() {
        window.firebase.auth().setPersistence(window.firebase.auth.Auth.Persistence.SESSION).then(function() {
            window.firebase.auth().signInWithRedirect(provider);
        }).catch(function(error) {
            console.error(error);
        });
    }

    loginCallback(user) {
        console.debug("loginCallback", user);

        if (!user) {
            this.setState({'phase': 'login', 'user': undefined});
            return;
        }

         // Get invite id.
         let { id } = useParams();
         let inviteID = id;

         // Get invite object.
         db.collection("invites").doc(inviteID).get().then((doc) => {
            if (!doc.exists) {
                window.location.assign("/404");
                return;
            }

            let invite = doc.data();
            console.debug("invite:", invite)

            let userRef = db.collection("users").doc(user.ID);
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
                        console.debug("Failed to add organization to user");
                        this.setState({
                            loginSuccess: false
                        })
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
                    console.debug("Failed to create user");
    
                    this.setState({
                        loginSuccess: false
                    })
                    return;
                })
            })
         }).catch((e) => {
            console.debug("Failed to get user");

            this.setState({
                loginSuccess: false
            })
            return;
         })
    }

    componentDidMount() {
        window.firebase.auth().onAuthStateChanged(this.loginCallback);
    }
   
    
    render() {
        console.debug(this.state);

        if (this.state.phase === 'logging_in') {
            return Loading();
        }
    
        if (this.state.phase === 'login') {
            let loginFailedMessage = !this.state.loginSuccess ? <Alert variant="danger">Login failed</Alert> : <div></div>;
            return <div className="outerContainer"><div className="loginContainer">
                <h2>CustomerDB</h2>
                <br/>
                {loginFailedMessage}
                <Button onClick={this.login}>Login with Google</Button>
            </div></div>;
        }
        
        return <p>Activate</p>;
    }
}

export default ActivateInvite;