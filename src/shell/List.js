import React, { useState, useEffect, useContext } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";

import Container from "react-bootstrap/Container";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import Button from "react-bootstrap/Button";

import { useLocation, useNavigate } from "react-router-dom";

import { getSearchClient } from "../search/client.js";

import { Loading } from "../util/Utils.js";

import {
  InstantSearch,
  SearchBox,
  connectStateResults,
  connectHits,
} from "react-instantsearch-dom";

import "../search/style.css";

export default class List extends React.Component {
  constructor(props) {
    super(props);
  }

  static Search(props) {
    const auth = useContext(UserAuthContext);

    // props.path = (ID) => {}
    // props.options = (ID) => {}

    const [searchClient, setSearchClient] = useState();

    useEffect(() => {
      getSearchClient(auth.oauthClaims.orgID, auth.oauthUser.uid).then(
        (client) => {
          setSearchClient(client);
        }
      );
    }, []);

    if (!searchClient) {
      return <Loading />;
    }

    const CustomHits = connectHits((result) =>
      result.hits.map((hit) => <List.Item name={hit.name} />)
    );

    // options={props.options(hit.objectID)} path={props.path(hit.objectID)}

    let children = props.children.slice();
    let list;
    for (let i = 0; i < children.length; i++) {
      let child = React.cloneElement(children[i], {});

      if (child.type.name == "Items") {
        const Results = connectStateResults(({ searchState }) =>
          searchState && searchState.query ? <CustomHits /> : child
        );
        children[i] = <Results />;
        break;
      }
    }

    return (
      <InstantSearch indexName={props.index} searchClient={searchClient}>
        {children}
      </InstantSearch>
    );
  }

  static SearchBox(props) {
    return (
      <Row className="pb-3">
        <Col>
          <SearchBox />
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
    // Check whether a search component is

    return (
      <Col md={3} className="pt-4">
        <Container className="d-flex flex-column h-100">
          {this.props.children}
        </Container>
      </Col>
    );
  }
}
