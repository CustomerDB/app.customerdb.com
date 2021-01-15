import React, { useContext } from "react";
import { useParams } from "react-router-dom";

import Grid from "@material-ui/core/Grid";
import Members from "./Members.js";
import Profile from "./Profile.js";
import UserAuthContext from "../auth/UserAuthContext";
import Typography from "@material-ui/core/Typography";
import PrivacySettings from "./PrivacySettings.js";
import OrgSettings from "./OrgSettings.js";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);
  const { orgID } = useParams();

  return (
    <Grid container>
      <grid container item xs={12}>
        <Typography
          align="center"
          variant="h6"
          style={{ fontWeight: "bold", padding: "1rem" }}
          component="h2"
        >
          Settings
        </Typography>
      </grid>
      <Grid container item xs={12}>
        <Profile />
        {auth.oauthClaims.orgs[orgID].admin === true && <Members />}
        {auth.oauthClaims.orgs[orgID].admin === true && <OrgSettings />}
        <PrivacySettings />
      </Grid>
    </Grid>
  );
}
