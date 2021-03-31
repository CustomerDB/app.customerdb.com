// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import CallDetailsDialog from "./CallDetailsDialog.js";
import DocumentRestartCallDialog from "./DocumentRestartCallDialog.js";
import Grid from "@material-ui/core/Grid";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import Moment from "react-moment";
import OnAirIcon from "./OnAirIcon.js";
import VideoCallIcon from "@material-ui/icons/VideoCall";
import useFirestore from "../db/Firestore.js";

// disabled is a function that takes a call as input
export default function CallDetails({ document, isDisabled }) {
  const callID = document.callID;
  const { callsRef } = useFirestore();
  const [call, setCall] = useState();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
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

  let joinButton = (
    <Button
      disabled={isDisabled(call)}
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
  );

  if (call.callEndedTimestamp) {
    joinButton = (
      <Button
        variant="contained"
        color="primary"
        onClick={() => {
          setRestartDialogOpen(true);
        }}
        startIcon={<VideoCallIcon />}
        style={{ marginRight: "1rem" }}
      >
        Restart call
      </Button>
    );
  }

  return (
    <>
      <Grid container item xs={12} style={{ padding: "2rem" }} justify="center">
        {joinButton}
        <Button
          disabled={isDisabled(call)}
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
      <DocumentRestartCallDialog
        open={restartDialogOpen}
        setOpen={setRestartDialogOpen}
        document={document}
      />
    </>
  );
}
