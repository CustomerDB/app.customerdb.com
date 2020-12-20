import { connectAutoComplete } from "react-instantsearch-dom";
import { fade, makeStyles } from "@material-ui/core/styles";
import {
  InstantSearch,
  connectSearchBox,
  Index,
} from "react-instantsearch-dom";
import { useSearchClient } from "../search/client.js";
import UserAuthContext from "../auth/UserAuthContext";
import useFirestore from "../db/Firestore.js";
import InputBase from "@material-ui/core/InputBase";
import React, { useEffect, useState, useContext } from "react";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import DescriptionIcon from "@material-ui/icons/Description";
import TheatersIcon from "@material-ui/icons/Theaters";
import Avatar from "@material-ui/core/Avatar";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Moment from "react-moment";
import { useNavigate, useParams } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  inputRoot: {
    color: "inherit",
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
  search: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(3),
      width: "auto",
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: "40px",
    height: "40px",
    marginRight: "1rem",
  },
}));

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
    return <></>;
  }

  return (
    <InstantSearch
      indexName={props.search.index}
      searchClient={searchClient}
      searchState={searchState}
      onSearchStateChange={(st) => setSearchState(st)}
    >
      {props.children}
    </InstantSearch>
  );
}

const SearchBox = ({
  currentRefinement,
  isSearchStalled,
  refine,
  placeholder,
}) => {
  const classes = useStyles();

  return (
    <div className={classes.search}>
      <div className={classes.searchIcon}>
        <SearchIcon />
      </div>
      <InputBase
        placeholder="Search…"
        classes={{
          root: classes.inputRoot,
          input: classes.inputInput,
        }}
        inputProps={{ "aria-label": "search" }}
        value={currentRefinement}
        onChange={(event) => {
          refine(event.currentTarget.value);
        }}
      />
    </div>
  );
};

const CustomSearchBox = connectSearchBox(SearchBox);

export function SearchInput(props) {
  return <CustomSearchBox />;
}

// Autocomplete search
const OmniAutocomplete = ({
  hits,
  currentRefinement,
  refine,
  defaultRefinement,
  searchState,
}) => {
  const classes = useStyles();
  const navigate = useNavigate();
  const { orgID } = useParams();

  const auth = useContext(UserAuthContext);
  const { membersRef } = useFirestore();
  const [member, setMember] = useState();

  const [value, setValue] = useState({ name: defaultRefinement });
  const [open, setOpen] = useState(false);

  const documentIndex = process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX;
  const peopleIndex = process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX;
  const highlightsIndex = process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX;

  useEffect(() => {}, []);

  let documents = [];
  let people = [];
  let highlights = [];
  hits.forEach((section) => {
    if (section.index == documentIndex) {
      documents = section.hits;
    }

    if (section.index == peopleIndex) {
      people = section.hits;
    }

    if (section.index == highlightsIndex) {
      highlights = section.hits;
    }
  });

  people = people.slice(0, 8);

  documents.sort((a, b) => b.creationTimestamp - a.creationTimestamp);
  documents = documents.slice(0, 5);

  // // sort category based on time.
  // let topHits = combinedHits.slice(0, 5);

  let showResults = !!searchState.query;

  let recentSearches = [];

  const saveSearch = () => {};

  const removeSavedSearch = (index) => {};

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
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {!showResults && recentSearches.legnth > 0 && (
              <Grid container item xs={12}>
                <Grid container item xs={12}>
                  <p>
                    <b>Recent</b>
                  </p>
                </Grid>
                <Grid container item xs={12}>
                  {/* Replace with member specific search results */}
                  <p>foo</p>
                </Grid>
              </Grid>
            )}

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
                        <Grid item xs="auto" style={{ width: "8rem" }}>
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

                        return (
                          <Grid
                            container
                            item
                            xs={12}
                            style={{ paddingBottom: "0.5rem" }}
                          >
                            <Grid
                              container
                              item
                              xs={1}
                              justify="flex-end"
                              alignItems="center"
                            >
                              {hit.transcriptText !== "" ? (
                                <Avatar className={classes.avatar}>
                                  <TheatersIcon />
                                </Avatar>
                              ) : (
                                <Avatar className={classes.avatar}>
                                  <DescriptionIcon />
                                </Avatar>
                              )}
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
              </Grid>
            )}
          </Grid>
        </Box>
      </ClickAwayListener>
    </div>
  );

  // return (
  //   <Autocomplete
  //     fullWidth
  //     classes={classes}
  //     value={value}
  //     style={{
  //       paddingRight: "1rem",
  //     }}
  //     onChange={(event, option) => {
  //       if (option) {
  //         setValue(option.name);

  //         // Navigate to the right type.
  //         let prefix = `/orgs/${orgID}`;
  //         if (option.kind == documentIndex) {
  //           navigate(`${prefix}/interviews/${option.objectID}`);
  //         } else if (option.kind == peopleIndex) {
  //           navigate(`${prefix}/people/${option.objectID}`);
  //         }
  //       } else {
  //         // Clear
  //         setValue({ name: "" });
  //       }
  //     }}
  //     inputValue={currentRefinement}
  //     onInputChange={(event, newInputValue) => {
  //       refine(newInputValue);
  //     }}
  //     forcePopupIcon={false}
  //     selectOnFocus
  //     clearOnBlur
  //     handleHomeEndKeys
  //     getOptionLabel={(option) => {
  //       if (option.name) {
  //         return option.name;
  //       }

  //       if (option.text) {
  //         return option.text;
  //       }

  //       return option;
  //     }}
  //     getOptionSelected={(option, value) => option.objectID === value.objectID}
  //     options={combinedHits}
  //     renderInput={(params) => (
  //       <TextField
  //         placeholder="Search..."
  //         {...params}
  //         InputProps={{
  //           ...params.InputProps,
  //           disableUnderline: true,
  //           startAdornment: (
  //             <InputAdornment position="start">
  //               <SearchIcon />
  //             </InputAdornment>
  //           ),
  //         }}
  //       />
  //     )}
  //     renderOption={(option) => {
  //       console.log("Option: ", option);

  //       let avatar;
  //       if (option.kind === peopleIndex) {
  //         avatar = (
  //           <Avatar
  //             className={classes.avatar}
  //             alt={option.name}
  //             src={option.imageURL}
  //           />
  //         );
  //       }

  //       if (option.kind === documentIndex) {
  //         if (option.transcriptText !== "") {
  //           avatar = (
  //             <Avatar className={classes.avatar}>
  //               <TheatersIcon />
  //             </Avatar>
  //           );
  //         } else {
  //           avatar = (
  //             <Avatar className={classes.avatar}>
  //               <DescriptionIcon />
  //             </Avatar>
  //           );
  //         }
  //       }

  //       if (option.kind === highlightsIndex) {
  //         avatar = (
  //           <Avatar
  //             className={classes.avatar}
  //             alt={option.personName}
  //             src={option.personImageURL}
  //           />
  //         );
  //       }

  //       let creationDate;
  //       if (option.creationTimestamp) {
  //         creationDate = new Date(option.creationTimestamp * 1000);
  //       }

  //       return (
  //         <Grid container alignItems="center">
  //           <Grid container item xs={1} justify="flex-end">
  //             {avatar}
  //           </Grid>
  //           <Grid container item xs={9} justify="flex-start">
  //             {option.name || <i>"...{option.text}..."</i>}
  //           </Grid>
  //           <Grid container item xs={2} justify="flex-start">
  //             <Moment fromNow date={creationDate} />
  //           </Grid>
  //         </Grid>
  //       );
  //     }}
  //   />
  // );
};

const ConnectedAutocomplete = connectAutoComplete(OmniAutocomplete);

export function OmniSearch(props) {
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
      <Index indexName={process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX} />
      <Index indexName={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX} />
      <Index indexName={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX} />
    </InstantSearch>
  );
}
