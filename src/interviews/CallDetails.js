import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import CallDetailsDialog from "./CallDetailsDialog.js";
import Grid from "@material-ui/core/Grid";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
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

  return (
    <>
      <Grid item>
        <Button
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
          startIcon={<InfoOutlinedIcon />}
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          Call Details
        </Button>
      </Grid>
      <CallDetailsDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        callLink={callLink}
      />
    </>
  );
}
