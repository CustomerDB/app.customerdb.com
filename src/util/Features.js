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
