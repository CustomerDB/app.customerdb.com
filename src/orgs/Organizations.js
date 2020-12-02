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
    <Shell noOrgSelector noSidebar>
      <Grid container style={{ padding: "1rem" }}>
        <PendingInvites orgIDs={orgIDs} />

        <Grid container item xs={12}>
          <Grid item xs={12}>
            <h5>Organizations</h5>
          </Grid>
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
  const [rerender, setRerender] = useState();

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
  }, [firebase, rerender]);

  if (!invitedOrgs || !invitedOrgs.length) return <></>;

  const inviteCards = invitedOrgs.map(
    ({ orgID, orgName, inviteSentTimestamp }) => (
      <InviteCard
        key={orgID}
        orgID={orgID}
        orgName={orgName}
        inviteSentTimestamp={inviteSentTimestamp}
        setRerender={setRerender}
      />
    )
  );

  return (
    <Grid container item xs={12}>
      <Grid item xs={12}>
        <h5>Pending invites</h5>
      </Grid>
      {inviteCards}
    </Grid>
  );
}
