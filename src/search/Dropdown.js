import "./style.css";

import {
  InstantSearch,
  connectHits,
  connectSearchBox,
} from "react-instantsearch-dom";
import React, { useContext, useEffect, useRef, useState } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import { getSearchClient } from "./client.js";

const SearchBox = ({ currentRefinement, isSearchStalled, refine, setShow }) => (
  <form>
    <input
      style={{
        padding: ".375rem .75rem",
        outline: "none",
        border: "none",
        borderRadius: "0.25rem",
        width: "100%",
      }}
      type="search"
      value={currentRefinement}
      onClick={() => setShow(true)}
      onChange={(event) => {
        refine(event.currentTarget.value);
        setShow(true);
      }}
    />
  </form>
);

const CustomSearchBox = connectSearchBox(SearchBox);

export default function SearchDropdown(props) {
  const ref = useRef(null);
  const auth = useContext(UserAuthContext);

  const [show, setShow] = useState(false);

  const [searchState, setSearchState] = useState({
    query: props.default,
  });

  const [searchClient, setSearchClient] = useState();

  useEffect(() => {
    const handleClose = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setShow(false);
      }
    };

    document.addEventListener("mousedown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
    };
  }, [ref]);

  useEffect(() => {
    if (!props.index) {
      return;
    }

    getSearchClient(auth.oauthClaims.orgID, auth.oauthUser.uid).then(
      (client) => {
        setSearchClient(client);
      }
    );
  }, [auth.oauthClaims.orgID, auth.oauthUser.uid, props.index]);

  if (!searchClient) {
    return <></>;
  }

  const CustomHits = connectHits((result) => {
    console.debug("Recieved search results ", result.hits.length);
    return result.hits.map((hit) => (
      <p
        key={hit.objectID}
        onClick={() => {
          setSearchState({ query: hit.name });
          setShow(false);
          if (props.onChange) {
            props.onChange(hit.objectID, hit.name);
          }
        }}
      >
        {hit.name}
      </p>
    ));
  });

  return (
    <div
      ref={ref}
      style={{
        border: "1px solid #ced4da",
        borderRadius: "0.25rem",
      }}
    >
      <InstantSearch
        indexName={props.index}
        searchClient={searchClient}
        searchState={searchState}
        onSearchStateChange={(st) => setSearchState(st)}
      >
        <CustomSearchBox setShow={setShow} />

        {show && (
          <div style={{ padding: ".375rem .75rem" }}>
            <CustomHits />
          </div>
        )}
      </InstantSearch>
    </div>
  );
}
