import "react-quill/dist/quill.snow.css";

import {
  InstantSearch,
  connectHits,
  connectSearchBox,
} from "react-instantsearch-dom";
import { fade, makeStyles } from "@material-ui/core/styles";

import Grid from "@material-ui/core/Grid";
import InputBase from "@material-ui/core/InputBase";
import Quote from "./Quote.js";
import React from "react";
import SearchIcon from "@material-ui/icons/Search";
import Shell from "../shell/Shell.js";
import { useSearchClient } from "../search/client.js";

function SearchBox({
  currentRefinement,
  isSearchStalled,
  refine,
  placeholder,
}) {
  const useStyles = makeStyles((theme) => ({
    inputRoot: {
      color: "inherit",
      padding: 0,
    },
    inputInput: {
      // vertical padding + font size from searchIcon
      paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
      transition: theme.transitions.create("width"),
      width: "100%",
      height: "3rem",
      padding: 0,
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
      justifyContent: "center",
      alignItems: "center",
      height: "3rem",
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
        }}
        inputProps={{ "aria-label": "search" }}
        value={currentRefinement}
        onChange={(event) => {
          refine(event.currentTarget.value);
        }}
      />
    </div>
  );
}

export default function Quotes(props) {
  const searchClient = useSearchClient();
  // const [searchState, setSearchState] = useState({});

  if (!searchClient) {
    console.error("search client not available");
    return <></>;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  const quoteIndex = process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX;
  const CustomSearchBox = connectSearchBox(SearchBox);

  const SearchResults = connectHits((result) => {
    console.debug(`got ${result.hits.length} results`);
    return result.hits.map((hit) => {
      console.debug("hit", hit);
      return <Quote key={hit.objectID} hit={hit} />;
    });
  });

  let searchGrid = (
    <InstantSearch indexName={quoteIndex} searchClient={searchClient}>
      <Grid container item xs={12} alignItems="flex-start" direction="column">
        <Grid
          container
          item
          style={{ height: "3rem", backgroundColor: "white" }}
        >
          <CustomSearchBox />
        </Grid>
        <Grid container item spacing={0}>
          <SearchResults />
        </Grid>
      </Grid>
    </InstantSearch>
  );

  return (
    <Shell title="Quotes">
      <Grid container className="fullHeight">
        <Grid container item xs>
          {searchGrid}
        </Grid>
      </Grid>
    </Shell>
  );
}