import { makeStyles } from "@material-ui/core/styles";
import {
  InstantSearch,
  connectSearchBox,
  Index,
  connectAutoComplete,
} from "react-instantsearch-dom";
import { useSearchClient } from "../search/client.js";
import FormatQuoteIcon from "@material-ui/icons/FormatQuote";
import React, { useEffect, useState } from "react";
import SearchIcon from "@material-ui/icons/Search";
import { Loading } from "../util/Utils.js";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import DescriptionIcon from "@material-ui/icons/Description";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Chip from "@material-ui/core/Chip";
import Divider from "@material-ui/core/Divider";
import Tooltip from "@material-ui/core/Tooltip";
import Moment from "react-moment";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import GroupIcon from "@material-ui/icons/Group";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import { useQuery } from "../util/Query.js";

const useStyles = makeStyles((theme) => ({
  avatar: {
    width: "40px",
    height: "40px",
    marginRight: "1rem",
  },
  searchAvatar: {
    width: "40px",
    height: "40px",
  },
}));

const URLSearch = ({ currentRefinement, refine }) => {
  const query = useQuery();

  useEffect(() => {
    let refinement = query.get("q") || "";

    if (currentRefinement !== refinement) {
      refine(refinement);
    }
  }, [query, currentRefinement, refine]);

  return <></>;
};

const ConnectedURLSearch = connectSearchBox(URLSearch);

export function Search(props) {
  const [searchState, setSearchState] = useState({});
  const searchClient = useSearchClient();

  useEffect(() => {
    if (!props.search || !props.search.setShowResults) {
      return;
    }
    props.search.setShowResults(searchState.query);
  }, [props.search, searchState]);

  if (!props.search) {
    return props.children;
  }

  if (!searchClient) {
    return <Loading />;
  }

  return (
    <InstantSearch
      indexName={props.search.index}
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      <ConnectedURLSearch />
      {props.children}
    </InstantSearch>
  );
}

function peopleFromHits(hits) {
  const peopleIndex = process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX;
  let people = [];
  hits.forEach((section) => {
    if (section.index === peopleIndex) {
      people = section.hits;
    }
  });

  const maxPeople = 8;
  people = people.slice(0, maxPeople);

  return people;
}

function documentsFromHits(hits) {
  const documentIndex = process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX;
  let documents = [];
  hits.forEach((section) => {
    if (section.index === documentIndex) {
      documents = section.hits;
    }
  });

  const maxDocuments = 5;
  documents.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
  documents = documents.slice(0, maxDocuments);

  return documents;
}

function RefinementChip() {
  const query = useQuery();
  const navigate = useNavigate();
  const location = useLocation();

  return query.get("q") ? (
    <Chip
      label={query.get("q")}
      onDelete={() => {
        navigate(location.pathname);
      }}
    />
  ) : (
    <></>
  );
}

const Autocomplete = ({ hits, currentRefinement, refine, searchState }) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { orgID } = useParams();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  let documents = documentsFromHits(hits);
  let people = peopleFromHits(hits);

  let showResults = !!searchState.query;

  const enterToSearch = (e) => {
    if (e.key === "Enter") {
      const searchWhitelist = ["quotes", "people", "interviews"];
      searchWhitelist.forEach((component) => {
        if (location.pathname.startsWith(`/orgs/${orgID}/${component}`)) {
          setOpen(false);
          refine("");
          navigate(`/orgs/${orgID}/${component}?q=${currentRefinement}`);
        }
      });
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <ClickAwayListener
        onClickAway={() => {
          setOpen(false);
        }}
      >
        <Box
          component={Grid}
          container
          boxShadow={open ? 3 : 0}
          style={{
            position: "fixed",
            background: "white",
            paddingLeft: "0.5rem",
            top: "1rem",
            height: open ? "" : "2rem",
            borderRadius: "0.5rem",
            zIndex: open ? "100" : "",
            maxWidth: "50rem",
            width: "60%",
            minWidth: "20rem",
            transition: "height 0.25s, box-shadow 0.25s",
            overflow: open ? "auto" : "hidden",
            color: "black",
          }}
        >
          <Grid container>
            <Grid container item xs={12}>
              <TextField
                placeholder="Search..."
                value={currentRefinement}
                onClick={() => {
                  setOpen(true);
                }}
                onChange={(event) => {
                  refine(event.currentTarget.value);
                }}
                onKeyDown={enterToSearch}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                      <RefinementChip />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {showResults && (
              <Grid container item xs={12} style={{ paddingTop: "1rem" }}>
                {people.length > 0 && (
                  <>
                    <Grid container item xs={12}>
                      <b>Customers</b>
                    </Grid>
                    <Grid
                      container
                      item
                      xs={12}
                      style={{ paddingTop: "0.5rem" }}
                    >
                      {people.map((hit) => (
                        <Grid
                          item
                          xs="auto"
                          style={{ width: "8rem", cursor: "pointer" }}
                          onClick={() => {
                            navigate(`/orgs/${orgID}/people/${hit.objectID}`);
                            setOpen(false);
                          }}
                        >
                          <Grid container item justify="center">
                            <Avatar alt={hit.name} src={hit.imageURL} />
                          </Grid>
                          <Grid container item justify="center">
                            <p style={{ textAlign: "center" }}>{hit.name}</p>
                          </Grid>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
                {documents.length > 0 && (
                  <>
                    <Grid container item xs={12}>
                      <b>Interviews</b>
                    </Grid>
                    <Grid
                      container
                      item
                      xs={12}
                      style={{ paddingTop: "0.5rem" }}
                    >
                      {documents.map((hit) => {
                        let creationDate;
                        if (hit.creationTimestamp) {
                          creationDate = new Date(hit.creationTimestamp * 1000);
                        }

                        let avatar = (
                          <Avatar
                            className={classes.avatar}
                            alt={hit.personName}
                          >
                            <DescriptionIcon />
                          </Avatar>
                        );

                        if (hit.personImageURL) {
                          avatar = (
                            <Avatar
                              className={classes.avatar}
                              alt={hit.personName}
                              src={hit.personImageURL}
                            />
                          );
                        }

                        if (hit.personName) {
                          avatar = (
                            <Tooltip title={hit.personName}>{avatar}</Tooltip>
                          );
                        }

                        return (
                          <Grid
                            container
                            item
                            xs={12}
                            style={{
                              paddingBottom: "0.5rem",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              navigate(
                                `/orgs/${orgID}/interviews/${hit.objectID}`
                              );
                              setOpen(false);
                            }}
                          >
                            <Grid
                              container
                              item
                              xs={1}
                              justify="flex-end"
                              alignItems="center"
                            >
                              {avatar}
                            </Grid>
                            <Grid
                              container
                              item
                              xs={9}
                              justify="flex-start"
                              alignItems="center"
                            >
                              {hit.name}
                            </Grid>
                            <Grid
                              container
                              item
                              xs={2}
                              justify="flex-start"
                              alignItems="center"
                            >
                              <small>
                                <Moment fromNow date={creationDate} />
                              </small>
                            </Grid>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </>
                )}
                <Divider />
                <Grid container item xs={12}>
                  <b>Search</b>
                </Grid>
                <Grid container item xs={12} style={{ paddingTop: "0.5rem" }}>
                  <Grid
                    container
                    item
                    xs={4}
                    justify="center"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      navigate(`/orgs/${orgID}/quotes?q=${currentRefinement}`);
                      setOpen(false);
                      refine("");
                    }}
                  >
                    <Grid container item justify="center">
                      <Avatar className={classes.searchAvatar}>
                        <FormatQuoteIcon />
                      </Avatar>
                    </Grid>
                    <Grid container item justify="center">
                      Quotes
                    </Grid>
                  </Grid>
                  <Grid
                    container
                    item
                    xs={4}
                    justify="center"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      navigate(
                        `/orgs/${orgID}/interviews?q=${currentRefinement}`
                      );
                      setOpen(false);
                      refine("");
                    }}
                  >
                    <Grid container item justify="center">
                      <Avatar className={classes.searchAvatar}>
                        <RecordVoiceOverIcon />
                      </Avatar>
                    </Grid>
                    <Grid container item justify="center">
                      Interviews
                    </Grid>
                  </Grid>
                  <Grid
                    container
                    item
                    xs={4}
                    justify="center"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      navigate(`/orgs/${orgID}/people?q=${currentRefinement}`);
                      setOpen(false);
                      refine("");
                    }}
                  >
                    <Grid container item justify="center">
                      <Avatar className={classes.searchAvatar}>
                        <GroupIcon />
                      </Avatar>
                    </Grid>
                    <Grid container item justify="center">
                      Customers
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Box>
      </ClickAwayListener>
    </div>
  );
};

const ConnectedAutocomplete = connectAutoComplete(Autocomplete);

export function SearchDropdown() {
  const [searchState, setSearchState] = useState({});
  const searchClient = useSearchClient();

  if (!searchClient) {
    return <></>;
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      <ConnectedAutocomplete searchState={searchState} />
      <Index indexName={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX} />
      <Index indexName={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX} />
    </InstantSearch>
  );
}
