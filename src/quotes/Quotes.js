import "react-quill/dist/quill.snow.css";

import { connectInfiniteHits } from "react-instantsearch-dom";
import { useTheme } from "@material-ui/core/styles";

import Grid from "@material-ui/core/Grid";
import Quote from "./Quote.js";
import React, { useEffect, useRef } from "react";
import { Search } from "../shell/Search.js";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useSearchClient } from "../search/client.js";
import { Loading } from "../util/Utils.js";
import EmptyStateHelp from "../util/EmptyStateHelp.js";
import { useParams } from "react-router-dom";

function InfiniteHits({ hasMore, refine, hits }) {
  const theme = useTheme();

  const mdBreakpoint = useMediaQuery(theme.breakpoints.up("md"));
  const lgBreakpoint = useMediaQuery(theme.breakpoints.up("lg"));
  const xlBreakpoint = useMediaQuery(theme.breakpoints.up("xl"));

  const { orgID } = useParams();

  let colCount = 1;

  if (mdBreakpoint) {
    colCount = 2;
  }

  if (lgBreakpoint) {
    colCount = 3;
  }

  if (xlBreakpoint) {
    colCount = 4;
  }

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

  let cols = Array.from(Array(colCount), () => []);
  for (let i = 0; i < hits.length; i++) {
    cols[i % colCount].push(hits[i]);
  }

  if (hits.length === 0) {
    return (
      <>
        <EmptyStateHelp
          title="Get started by adding an interview"
          description="Customer quotes will appear here once you have added and highlighted interviews."
          buttonText="Go to interviews"
          path={`/orgs/${orgID}/interviews`}
        />
        <div ref={(c) => (sentinel.current = c)}></div>
      </>
    );
  }

  return (
    <>
      {cols.map((col) => (
        <Grid container item direction="row" xs={12} md={6} lg={4} xl={3}>
          {col.map((hit) => (
            <Quote key={hit.objectID} hit={hit} />
          ))}
        </Grid>
      ))}
      <div
        ref={(c) => (sentinel.current = c)}
        style={{ height: "1rem", width: "1rem" }}
      ></div>
    </>
  );
}

export default function Quotes(props) {
  const searchClient = useSearchClient();

  if (!searchClient) {
    console.error("search client not available");
    return <Loading />;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  const SearchResults = connectInfiniteHits(InfiniteHits);

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX,
      setShowResults: (value) => {},
    };
  }

  let searchGrid = (
    <Grid container item xs={12} alignItems="flex-start" direction="column">
      <Grid container item spacing={0} alignItems="baseline">
        <SearchResults />
      </Grid>
    </Grid>
  );

  return (
    <Search search={searchConfig}>
      <Grid container className="fullHeight">
        <Grid container item xs>
          {searchGrid}
        </Grid>
      </Grid>
    </Search>
  );
}
