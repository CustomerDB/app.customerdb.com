import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import AvatarGroup from "@material-ui/lab/AvatarGroup";
import FirebaseContext from "../util/FirebaseContext.js";
import Tooltip from "@material-ui/core/Tooltip";
import UserAuthContext from "../auth/UserAuthContext.js";

const syncPeriod = 5000;

export default function Collaborators(props) {
  const { oauthUser } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!props.dbRef) {
      return;
    }

    const updateCollaborators = () => {
      let collaboratorRef = props.dbRef
        .collection("collaborators")
        .doc(oauthUser.email);

      let collaborator = {
        expires: firebase.firestore.Timestamp.now().toMillis() + 5000,
      };

      if (oauthUser.email) {
        collaborator.email = oauthUser.email;
      }

      if (oauthUser.displayName) {
        collaborator.name = oauthUser.displayName;
      }

      if (oauthUser.photoURL) {
        collaborator.photoURL = oauthUser.photoURL;
      }

      collaboratorRef.set(collaborator).then(() => {
        props.dbRef
          .collection("collaborators")
          .get()
          .then((snapshot) => {
            let newCollaborators = [];
            let now = firebase.firestore.Timestamp.now().toMillis();
            snapshot.forEach((doc) => {
              let collaborator = doc.data();
              if (collaborator.expires < now) {
                doc.ref.delete();
                return;
              }

              newCollaborators.push(doc.data());
            });

            setCollaborators(newCollaborators);
          });
      });
    };

    updateCollaborators();

    let interval = setInterval(() => {
      updateCollaborators();
    }, syncPeriod);

    return () => {
      clearInterval(interval);
    };
  }, [
    props.dbRef,
    oauthUser.displayName,
    oauthUser.email,
    oauthUser.photoURL,
    firebase.firestore.Timestamp,
  ]);

  return (
    <AvatarGroup max={4} style={{ minHeight: "2.5rem" }}>
      {collaborators.map((collaborator) => (
        <Tooltip title={collaborator.name}>
          <Avatar
            key={collaborator.email}
            alt={collaborator.name}
            src={collaborator.photoURL}
          />
        </Tooltip>
      ))}
    </AvatarGroup>
  );
}
