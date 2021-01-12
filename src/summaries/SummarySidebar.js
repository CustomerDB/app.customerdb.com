import React, { useEffect, useRef, useState } from "react";

import { useSearchClient } from "../search/client.js";
import { useParams } from "react-router-dom";
import { Loading } from "../util/Utils.js";
import { Search } from "../shell/Search.js";
import Scrollable from "../shell/Scrollable.js";
import QuoteHit from "./QuoteHit.js";

import Box from "@material-ui/core/Box";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grid from "@material-ui/core/Grid";
import { connectInfiniteHits } from "react-instantsearch-dom";
import {
  InstantSearch,
  connectSearchBox,
  Index,
} from "react-instantsearch-dom";

function InfiniteHits({ hasMore, refine, hits }) {
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
    <Grid container className="fullHeight" style={{ position: "relative" }}>
      <Scrollable>
        {hits.map((hit) => (
          <Grid container item xs={12}>
            <QuoteHit key={hit.objectID} hit={hit} />
          </Grid>
        ))}
        <div
          ref={(c) => (sentinel.current = c)}
          style={{ height: "1rem", width: "1rem" }}
        ></div>
      </Scrollable>
    </Grid>
  );
}

export default function SummarySidebar({ reactQuillRef }) {
  const searchClient = useSearchClient();
  const [searchState, setSearchState] = useState({});

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

  return (
    <Grid container item md={4} xl={3} direction="column" spacing={0}>
      <Search search={searchConfig}>
        <SearchResults />
      </Search>
    </Grid>
  );
}
