import React, { useEffect, useState } from "react";
import useFirestore from "../db/Firestore.js";

// canonical feature flag names
export const HOSTED_CALLS = "HOSTED_CALLS";
export const QUOTE_SUGGESTIONS = "QUOTE_SUGGESTIONS";

// useOrgFeatures is a hook to subscribe to the current org feature set.
function useOrgFeatures() {
  const [features, setFeatures] = useState();
  const { orgRef } = useFirestore();

  useEffect(() => {
    if (!orgRef) return;

    return orgRef.collection("features").onSnapshot((snapshot) => {
      const newFeatures = {};
      snapshot.docs.forEach((doc) => {
        newFeatures[doc.id] = doc.data();
      });
      setFeatures(newFeatures);
    });
  }, [orgRef]);

  return features;
}

// Feature is a guard component that uses org features from the database
// to conditionally render children.
export default function Feature({ name, children }) {
  const features = useOrgFeatures();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(features && features[name] && features[name].enabled);
  }, [features, name]);

  if (!enabled) return <></>;

  return children;
}
