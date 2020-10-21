import React, { useEffect, useState } from "react";

import Link from "@material-ui/core/Link";
import useFirestore from "../db/Firestore.js";

export default function CallInfo({ callID }) {
  const { callsRef } = useFirestore();
  const [call, setCall] = useState();
  const meetDomain = process.env.REACT_APP_MEET_DOMAIN;

  useEffect(() => {
    if (!callsRef || !callID) {
      return;
    }
    return callsRef.doc(callID).onSnapshot((doc) => {
      setCall(doc.data());
    });
  }, [callsRef, callID]);

  if (!call) return <></>;

  return (
    <Link href={`${meetDomain}/${callID}`} target="_blank" rel="noopener">
      Join call
    </Link>
  );
}
