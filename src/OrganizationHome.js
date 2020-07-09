import React from 'react';

import { useEffect, useState } from 'react';

export default function OrganizationHome(props) {

  const [orgName, setOrgName] = useState(undefined);

  useEffect(() => {
    let unsubscribe = props.orgRef.onSnapshot(doc => {
      let org = doc.data();
      setOrgName(org.name);
    });

    return unsubscribe;
  }, []);

  return <div>
    <h1>{orgName}</h1>
  </div>;
}
