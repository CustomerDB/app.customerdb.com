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
            <OrgCard key={id} orgID={id} />
          ))}
        </Grid>
      </Grid>
    </Shell>
  );
}

function PendingInvites() {
  const firebase = useContext(FirebaseContext);
  const [invitedOrgs, setInvitedOrgs] = useState();

  useEffect(() => {
    if (!firebase) {
      return;
    }
    const getInvitedOrgs = firebase
      .functions()
      .httpsCallable("auth-getInvitedOrgs");
    getInvitedOrgs().then((result) => {
      console.debug("invited orgs", result.data);
      setInvitedOrgs(result.data);
    });
  }, [firebase]);

  if (!invitedOrgs || !invitedOrgs.length) return <></>;

  const inviteCards = invitedOrgs.map(
    ({ orgID, orgName, inviteSentTimestamp }) => (
      <InviteCard
        key={orgID}
        orgID={orgID}
        orgName={orgName}
        inviteSentTimestamp={inviteSentTimestamp}
      />
    )
  );

  return (
    <>
      <Grid container item xs>
        <Grid item xs>
          <p>Pending invites</p>
        </Grid>
        {inviteCards}
      </Grid>
      <hr />
    </>
  );
}
