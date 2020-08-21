import React, { useContext, useEffect, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import AvatarGroup from "@material-ui/lab/AvatarGroup";
import UserAuthContext from "../auth/UserAuthContext.js";

const syncPeriod = 5000;

export default function Collaborators(props) {
  const { oauthUser } = useContext(UserAuthContext);

  const [collaborators, setCollaborators] = useState();

  const updateCollaborators = () => {
    let collaboratorRef = props.dbRef
      .collection("collaborators")
      .doc(oauthUser.email);
    collaboratorRef
      .set({
        email: oauthUser.email,
        name: oauthUser.displayName,
        photoURL: oauthUser.photoURL,
        expires: window.firebase.firestore.Timestamp.now().toMillis() + 5000,
      })
      .then(() => {
        props.dbRef
          .collection("collaborators")
          .get()
          .then((snapshot) => {
            let newCollaborators = [];
            snapshot.forEach((doc) => {
              let now = window.firebase.firestore.Timestamp.now().toMillis();
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

  useEffect(() => {
    if (!props.dbRef) {
      return;
    }

    updateCollaborators();

    let interval = setInterval(() => {
      updateCollaborators();
    }, syncPeriod);

    return () => {
      clearInterval(interval);
    };
  }, [props.dbRef, oauthUser.displayName, oauthUser.email, oauthUser.photoURL]);

  if (!collaborators) {
    return <></>;
  }

  return (
    <AvatarGroup max={4}>
      {collaborators.map((collaborator) => (
        <Avatar
          key={collaborator.email}
          alt={collaborator.name}
          src={collaborator.photoURL}
        />
      ))}
    </AvatarGroup>
  );
}
