import React, { useState, useContext, useEffect } from "react";

import { getSearchClient } from "../search/client.js";

import UserAuthContext from "../auth/UserAuthContext.js";
import { Loading } from "../util/Utils.js";

import { InstantSearch, SearchBox, connectHits } from "react-instantsearch-dom";

import ObsoleteList from "../shell_obsolete/List.js";
import Scrollable from "../shell_obsolete/Scrollable.js";

export function Search(props) {
  const auth = useContext(UserAuthContext);

  const [searchState, setSearchState] = useState({});

  const [searchClient, setSearchClient] = useState();

  useEffect(() => {
    getSearchClient(auth.oauthClaims.orgID, auth.oauthUser.uid).then(
      (client) => {
        setSearchClient(client);
      }
    );
  }, [auth.oauthClaims.orgID, auth.oauthUser.uid]);

  if (!searchClient) {
    return <Loading />;
  }

  const CustomHits = connectHits((result) => {
    console.log("Recieved search results ", result.hits.length);
    return result.hits.map((hit) => (
      <ObsoleteList.Item
        key={hit.objectID}
        name={hit.name}
        path={props.path(hit.objectID)}
      />
    ));
  });

  if (!props.children) {
    return <></>;
  }

  let children = props.children;

  // Replace "ObsoleteList.Items" child with search results.
  if (searchState.query && searchState.query !== "") {
    console.log("searchState", searchState);
    children = props.children.slice();
    for (let i = 0; i < children.length; i++) {
      let child = children[i];

      if (child.type === ObsoleteList.Items) {
        console.log("Rerender custom hits");
        children[i] = (
          <ObsoleteList.Items>
            <Scrollable>
              <CustomHits />
            </Scrollable>
          </ObsoleteList.Items>
        );
        break;
      }
    }
  }

  return (
    <InstantSearch
      indexName={props.index}
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      {children}
    </InstantSearch>
  );
}
