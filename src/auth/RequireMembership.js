import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import FirebaseContext from "../util/FirebaseContext.js";
import UserAuthContext from "./UserAuthContext.js";

// RequireMembership renders the children only if the currently
// signed in user has any org membership (one or more active
// membership, or pending invite)
export default function RequireMembership({ children }) {
  const { oauthUser } = useContext(UserAuthContext);
  const [loaded, setLoaded] = useState(false);
  const [numOrgs, setNumOrgs] = useState();
  const firebase = useContext(FirebaseContext);

  useEffect(() => {
    if (!firebase || !oauthUser || !oauthUser.email) {
      return;
    }
    const db = firebase.firestore();

    console.debug("reading member records from database", oauthUser.email);
    return db
      .collectionGroup("members")
      .where("email", "==", oauthUser.email)
      .onSnapshot((snapshot) => {
        const count = snapshot.size;
        console.debug(
          `user ${oauthUser.email} is a member of ${count} organizations (active + invited)`
        );
        setNumOrgs(count);
        setLoaded(true);
      });
  }, [firebase, oauthUser]);

  if (!loaded) return <></>;

  if (loaded && numOrgs === 0) {
    return <Navigate to="/logout" />;
  }

  return children;
}
