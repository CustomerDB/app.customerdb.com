import { InstantSearch, connectSearchBox } from "react-instantsearch-dom";
import React, { useEffect, useState } from "react";
import { fade, makeStyles } from "@material-ui/core/styles";

import InputBase from "@material-ui/core/InputBase";
import SearchIcon from "@material-ui/icons/Search";
import { useSearchClient } from "../search/client.js";

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
    paper: {
      background: "green",
      border: "3px solid red",
    },
  }));
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
          paper: classes.paper,
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
