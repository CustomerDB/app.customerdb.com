import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FirebaseContext from "../util/FirebaseContext.js";
import FormControl from "@material-ui/core/FormControl";
import Hidden from "@material-ui/core/Hidden";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import UserAuthContext from "../auth/UserAuthContext";

export default function OrgSelector({}) {
  const { orgID } = useParams();
  const { oauthClaims } = useContext(UserAuthContext);
  const navigate = useNavigate();

  const firebase = useContext(FirebaseContext);
  const db = firebase.firestore();

  const [selectedOrgID, setSelectedOrgID] = useState();

  const [orgMap, setOrgMap] = useState({});

  useEffect(() => {
    if (!orgID) {
      return;
    }

    setSelectedOrgID(orgID);
  }, [orgID]);

  useEffect(() => {
    if (!oauthClaims.orgs) {
      return;
    }

    let orgIDs = Object.keys(oauthClaims.orgs);

    return db
      .collection("organizations")
      .where(firebase.firestore.FieldPath.documentId(), "in", orgIDs)
      .onSnapshot((snapshot) => {
        let newOrgMap = {};
        snapshot.forEach((doc) => {
          newOrgMap[doc.id] = doc.data().name;
        });
        console.log(newOrgMap);
        setOrgMap(newOrgMap);
      });
  }, [oauthClaims.orgs]);

  return (
    <Hidden smDown>
      <FormControl>
        <Select
          labelId="tag-group-select-label"
          id="tag-group-select"
          value={selectedOrgID}
          style={{ width: "10rem", color: "white" }}
          onChange={(event) => {
            console.log(`Event target: ${event.target.value}`);
            setSelectedOrgID(event.target.value);
            navigate(`/orgs/${event.target.value}`);
          }}
        >
          {Object.keys(orgMap).map((orgID) => (
            <MenuItem key={orgID} value={orgID}>
              {orgMap[orgID]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Hidden>
  );
}
