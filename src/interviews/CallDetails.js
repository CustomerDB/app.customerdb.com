import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import CallDetailsDialog from "./CallDetailsDialog.js";
import Grid from "@material-ui/core/Grid";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import Moment from "react-moment";
import OnAirIcon from "./OnAirIcon.js";
import VideoCallIcon from "@material-ui/icons/VideoCall";
import useFirestore from "../db/Firestore.js";

export default function CallDetails({ callID }) {
  const { callsRef } = useFirestore();
  const [call, setCall] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const meetDomain = process.env.REACT_APP_MEET_DOMAIN;
  const callLink = `${meetDomain}/${callID}`;

  useEffect(() => {
    if (!callsRef || !callID) {
      return;
    }
    return callsRef.doc(callID).onSnapshot((doc) => {
      let callData = doc.data();
      if (callData.deletionTimestamp !== "") {
        setCall();
        return;
      }
      setCall(doc.data());
    });
  }, [callsRef, callID]);

  if (!call) return <></>;

  let callEndedAt;

  if (call.callEndedTimestamp) {
    let endDate = call.callEndedTimestamp.toDate();
    callEndedAt = (
      <span style={{ marginLeft: "1rem" }}>
        <i>
          Call ended at <Moment format="LT" date={endDate} /> on{" "}
          <Moment format="D MMM YYYY" date={endDate} />
        </i>
      </span>
    );
  }

  let onAir;

  if (call.callStartedTimestamp && !call.callEndedTimestamp) {
    onAir = <OnAirIcon color="#FF0000" />;
  }

  return (
    <>
      <Grid item xs>
        <Button
          disabled={callEndedAt}
          variant="contained"
          color="primary"
          onClick={() => {
            window.open(callLink);
          }}
          startIcon={<VideoCallIcon />}
          style={{ marginRight: "1rem" }}
        >
          Join call
        </Button>
        <Button
          disabled={callEndedAt}
          startIcon={<InfoOutlinedIcon />}
          onClick={() => {
            if (!callEndedAt) {
              setDialogOpen(true);
            }
          }}
        >
          Call Details
        </Button>
        {onAir}
        {callEndedAt}
      </Grid>
      <CallDetailsDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        link={callLink}
        token={call.token}
      />
    </>
  );
}
