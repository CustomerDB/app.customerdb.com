import React, { useContext } from "react";
import { useParams } from "react-router-dom";

import Grid from "@material-ui/core/Grid";
import Members from "./Members.js";
import Profile from "./Profile.js";
import Shell from "../shell/Shell.js";
import UserAuthContext from "../auth/UserAuthContext";
import Typography from "@material-ui/core/Typography";
import PrivacySettings from "./PrivacySettings.js";

export default function Settings(props) {
  const auth = useContext(UserAuthContext);
  const { orgID, tabID } = useParams();

  return (
    <Shell>
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
          <PrivacySettings />
        </Grid>
      </Grid>
    </Shell>
  );
}
