import React, { useEffect, useRef, useState } from "react";

import { useSearchClient } from "../search/client.js";
import { Loading } from "../util/Utils.js";
import { Search } from "../shell/Search.js";
import Scrollable from "../shell/Scrollable.js";
import QuoteHit from "./QuoteHit.js";

import Grid from "@material-ui/core/Grid";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import { connectSearchBox, connectInfiniteHits } from "react-instantsearch-dom";

function InfiniteHits({ reactQuillRef, hasMore, refine, hits }) {
  let sentinel = useRef();
  let observer = useRef();

  useEffect(() => {
    if (!sentinel.current) {
      return;
    }

    observer.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore) {
          refine();
        }
      });
    });

    observer.current.observe(sentinel.current);

    return () => {
      observer.current.disconnect();
    };
  }, [sentinel, hasMore, refine]);

  if (hits.length === 0) {
    return (
      <>
        <div ref={(c) => (sentinel.current = c)}></div>
      </>
    );
  }

  return (
    <>
      {hits.map((hit) => (
        <Grid key={hit.objectID} container item xs={12}>
          <QuoteHit hit={hit} reactQuillRef={reactQuillRef} />
        </Grid>
      ))}
      <div
        ref={(c) => (sentinel.current = c)}
        style={{ height: "1rem", width: "1rem" }}
      ></div>
    </>
  );
}

const CustomSearchBox = ({ currentRefinement, refine }) => {
  console.debug("search box render", currentRefinement);

  return (
    <Grid
      container
      item
      xs={12}
      style={{
        position: "sticky",
        top: 0,
        backgroundColor: "#fff",
        zIndex: 100,
      }}
    >
      <TextField
        placeholder="Search evidence to include..."
        value={currentRefinement}
        onChange={(e) => {
          console.debug("search onChange", e, e.currentTarget.value);
          refine(e.currentTarget.value);
        }}
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        style={{
          width: "100%",
          borderRadius: "0.5rem",
          margin: "0.5rem",
        }}
      />
    </Grid>
  );
};

const SearchResults = connectInfiniteHits(InfiniteHits);
const SearchBox = connectSearchBox(CustomSearchBox);

export default function SummarySidebar({ reactQuillRef }) {
  const searchClient = useSearchClient();

  if (!searchClient) {
    console.error("search client not available");
    return <Loading />;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX,
    };
  }

  return (
    <Grid
      id="summarySidebarContainer"
      container
      item
      md={4}
      xl={3}
      direction="column"
      spacing={0}
    >
      <Grid
        container
        className="fullHeight"
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <Search search={searchConfig}>
          <Scrollable id="summary-sidebar-scroll">
            <SearchBox />
            <SearchResults reactQuillRef={reactQuillRef} />
          </Scrollable>
        </Search>
      </Grid>
    </Grid>
  );
}
