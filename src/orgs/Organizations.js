import React, { useContext, useEffect, useState } from "react";
import Grid from "@material-ui/core/Grid";
import Shell from "../shell/Shell.js";
import OrgCard from "./OrgCard.js";
import InviteCard from "./InviteCard.js";
import UserAuthContext from "../auth/UserAuthContext";
import FirebaseContext from "../util/FirebaseContext";

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
        <PendingInvites />
        <Grid container item xs>
          {orgIDs.map((id) => (
            <OrgCard orgID={id} />
          ))}
        </Grid>
      </Grid>
    </Shell>
  );
}

function PendingInvites() {
  const firebase = useContext(FirebaseContext);
  const getInvitedOrgs = firebase
    .functions()
    .httpsCallable("auth-getInvitedOrgs");
  const [invitedOrgs, setInvitedOrgs] = useState();

  useEffect(() => {
    if (!getInvitedOrgs) {
      return;
    }
    getInvitedOrgs().then((result) => {
      console.debug("invited orgs", result);
      setInvitedOrgs(result.data);
    });
  }, [getInvitedOrgs]);

  if (!invitedOrgs) return <></>;

  const inviteCards = invitedOrgs.map(
    ({ orgID, orgName, inviteSentTimestamp }) => (
      <InviteCard
        orgID={orgID}
        orgName={orgName}
        inviteSentTimestamp={inviteSentTimestamp}
      />
    )
  );

  return (
    <Grid container item xs>
      <Grid item xs>
        <p>Pending invites</p>
      </Grid>
      {inviteCards}
    </Grid>
  );
}
