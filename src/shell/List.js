import React, { useState, useEffect, useContext } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import FocusContext from "../util/FocusContext.js";

import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import { useLocation, useNavigate } from "react-router-dom";

import { getSearchClient } from "../search/client.js";

import { Loading } from "../util/Utils.js";

import { InstantSearch, SearchBox, connectHits } from "react-instantsearch-dom";

import "../search/style.css";

export default class List extends React.Component {
  static contextType = FocusContext;

  static Search(props) {
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

    const CustomHits = connectHits((result) =>
      result.hits.map((hit) => (
        <List.Item
          key={hit.objectID}
          name={hit.name}
          path={props.path(hit.objectID)}
        />
      ))
    );

    if (!props.children) {
      return <></>;
    }

    let children = props.children;

    // Replace "List.Items" child with search results.
    if (searchState.query && searchState.query !== "") {
      console.log("searchState", searchState);
      children = props.children.slice();
      for (let i = 0; i < children.length; i++) {
        let child = children[i];

        if (child.type.name === "Items") {
          console.log("Rerender custom hits");
          children[i] = <CustomHits />;
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

  static SearchBox(props) {
    return (
      <Row className="pb-3">
        <Col>
          <SearchBox
            translations={{
              submitTitle: "Submit your search query.",
              resetTitle: "Clear your search query.",
              placeholder: props.placeholder,
            }}
          />
        </Col>
      </Row>
    );
  }

  static Title(props) {
    return <Row className="pb-3">{props.children}</Row>;
  }

  static Name(props) {
    return (
      <Col md={10}>
        <h3>{props.children}</h3>
      </Col>
    );
  }

  static Add(props) {
    return (
      <Col md={2}>
        <Button className="Add" onClick={props.onClick}>
          +
        </Button>
      </Col>
    );
  }

  static Items(props) {
    return (
      <Row className="flex-grow-1" noGutters={true}>
        <Col className="h-100">{props.children}</Col>
      </Row>
    );
  }

  static Item(props) {
    const location = useLocation();
    const navigate = useNavigate();

    let isActive =
      props.path === location.pathname ||
      (!props.end && location.pathname.startsWith(props.path));

    let listClass = "ListItem";
    let options = props.options;
    if (isActive) {
      listClass += " Active";
      if (options) {
        options = React.cloneElement(options, {
          active: true,
        });
      }
    }

    return (
      <Row noGutters={true} className="pb-3">
        <Col
          className={listClass}
          onClick={(e) => {
            // FIXME: Avoid event propagation in a more robust way.
            let buttonElements = ["path", "svg", "BUTTON"];
            if (buttonElements.includes(e.target.nodeName)) {
              return;
            }
            if (props.path) {
              navigate(props.path);
            }
          }}
        >
          <Row noGutters={true} className="h-100 p-3">
            <Col className="align-self-center" ms={7} md={7} lg={9}>
              <p className="ListItemName">{props.name}</p>
            </Col>
            <Col className="align-self-center" md="auto">
              <div>{options}</div>
            </Col>
          </Row>
        </Col>
      </Row>
    );
  }

  render() {
    const shouldShow = !this.context.focus;
    return (
      shouldShow && (
        <Col md={3} className="pt-4">
          <Container className="d-flex flex-column h-100">
            {this.props.children}
          </Container>
        </Col>
      )
    );
  }
}
