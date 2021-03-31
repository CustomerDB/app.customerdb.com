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

import "./style.css";

import {
  InstantSearch,
  connectHits,
  connectSearchBox,
} from "react-instantsearch-dom";
import React, { useState } from "react";

import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import { Loading } from "../util/Utils.js";
import Row from "react-bootstrap/Row";
import { useSearchClient } from "./client.js";

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
  const [searchState, setSearchState] = useState({
    query: props.default,
  });

  const searchClient = useSearchClient();

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
