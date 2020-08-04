import React, { useState, useRef, useEffect, useContext } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import {
  InstantSearch,
  connectHits,
  connectSearchBox,
  RefinementList,
} from "react-instantsearch-dom";

import { getSearchClient } from "./client.js";
import { Loading } from "../util/Utils.js";

import "./style.css";

const SearchBox = ({ currentRefinement, isSearchStalled, refine }) => (
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
      onClick={() => {}}
      onChange={(event) => {
        refine(event.currentTarget.value);
      }}
    />
    {isSearchStalled ? "My search is stalled" : ""}
  </form>
);

const CustomSearchBox = connectSearchBox(SearchBox);

export default function ExampleGridSelector(props) {
  return (
    <div className="p-3" style={{ width: "60rem" }}>
      <GridSelector />
    </div>
  );
}

function GridSelector(props) {
  const auth = useContext(UserAuthContext);

  const [searchState, setSearchState] = useState({
    query: props.default,
  });

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
      <p
        onClick={() => {
          setSearchState({ query: hit.name });
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
    <InstantSearch
      indexName={"prod_DOCUMENTS"}
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      <div
        style={{
          border: "1px solid #ced4da",
          borderRadius: "0.25rem",
        }}
      >
        <CustomSearchBox />
      </div>
      <div className="p-3">
        <Row>
          <Col>
            <small>Author</small>
            <RefinementList attribute="createdBy" />
          </Col>
          <Col>
            <small>Author</small>
            <RefinementList attribute="createdBy" />
          </Col>
        </Row>
      </div>
      {
        <div style={{ padding: ".375rem .75rem" }}>
          <CustomHits />
        </div>
      }
    </InstantSearch>
  );
}
