import React, { useContext, useEffect, useState } from "react";
import Grid from "@material-ui/core/Grid";
import Shell from "../shell/Shell.js";
import OrgCard from "./OrgCard.js";
import UserAuthContext from "../auth/UserAuthContext";

export default function Organizations() {
  const { oauthClaims } = useContext(UserAuthContext);

  const [orgIDs, setOrgIDs] = useState([]);

  useEffect(() => {
    if (!oauthClaims || !oauthClaims.orgs) {
      return;
    }
    setOrgIDs(Object.keys(oauthClaims.orgs));
  }, [oauthClaims]);

  return (
    <Shell title="Organizations" noOrgSelector noSidebar>
      <Grid container className="fullHeight">
        <Grid container item xs>
          {orgIDs.map((id) => (
            <OrgCard orgID={id} />
          ))}
        </Grid>
      </Grid>
    </Shell>
  );
}
