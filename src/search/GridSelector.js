import {} from "react-bootstrap-icons";
import "./style.css";

import {
  InstantSearch,
  connectHits,
  connectSearchBox,
} from "react-instantsearch-dom";
import React, { useContext, useEffect, useState } from "react";

import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Loading } from "../util/Utils.js";
import Row from "react-bootstrap/Row";
import UserAuthContext from "../auth/UserAuthContext.js";
import { getSearchClient } from "./client.js";

const SearchBox = ({
  currentRefinement,
  isSearchStalled,
  refine,
  placeholder,
}) => (
  <>
    <Form.Control
      style={{
        width: "100%",
      }}
      type="search"
      placeholder={placeholder}
      value={currentRefinement}
      onClick={() => {}}
      onChange={(event) => {
        refine(event.currentTarget.value);
      }}
    />
    {isSearchStalled ? "My search is stalled" : ""}
  </>
);

const CustomSearchBox = connectSearchBox(SearchBox);

function Item(props) {
  let classes = ["ListItem", "mb-3", "p-3"];

  if (props.active) {
    classes.push("Active");
  }

  if (props.inactive) {
    classes.push("Inactive");
  }

  return (
    <Col md={4} key={props.ID}>
      <Row
        key={props.ID}
        noGutters={true}
        className={classes.join(" ")}
        onClick={() => {
          props.onClick(props.ID, props.name);
        }}
      >
        <Col key={props.ID} className="align-self-center" ms={7} md={7} lg={9}>
          <p className="ListItemName">{props.name}</p>
        </Col>
      </Row>
    </Col>
  );
}

export default function GridSelector(props) {
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
    return result.hits.map((hit) => {
      if (props.selectedIDs && props.selectedIDs.includes(hit.objectID)) {
        return <React.Fragment key={hit.objectID} />;
      }

      let inactive =
        props.selectedIDs && props.selectedIDs.length === props.itemLimit;

      return (
        <Item
          key={hit.objectID}
          ID={hit.objectID}
          inactive={inactive}
          name={hit.name}
          onClick={props.onItemClick}
        />
      );
    });
  });

  return (
    <InstantSearch
      indexName={props.index}
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      <Row key="searchInput">
        <Col className="mb-3" md={12}>
          <CustomSearchBox placeholder={props.placeholder} />
        </Col>
        <Col></Col>
      </Row>
      <Row className="d-flex" key="searchResults">
        {props.documents ? (
          props.documents.map((document) => (
            <Item
              key={document.ID}
              active={true}
              ID={document.ID}
              name={document.name}
              onClick={props.onItemClick}
            />
          ))
        ) : (
          <></>
        )}
        <CustomHits />
      </Row>
    </InstantSearch>
  );
}
