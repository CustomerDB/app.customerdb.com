import React, { useEffect, useRef } from "react";
import "intersection-observer"; // optional polyfill (webkit)

import { useSearchClient } from "../search/client.js";
import { Loading } from "../util/Utils.js";
import Scrollable from "../shell/Scrollable.js";
import QuoteHit from "./QuoteHit.js";
import ThemeHit from "./ThemeHit.js";

import Grid from "@material-ui/core/Grid";
import InputAdornment from "@material-ui/core/InputAdornment";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import {
  InstantSearch,
  Index,
  connectAutoComplete,
  connectSearchBox,
  connectInfiniteHits,
} from "react-instantsearch-dom";

function InfiniteHits(props) {
  const { reactQuillRef, hasMore, refine, hits, quoteHits, themeHits } = props;

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

  if (hits.length === 0 || !quoteHits || !themeHits) {
    return (
      <>
        <div ref={(c) => (sentinel.current = c)}></div>
      </>
    );
  }

  const allHits = [];

  quoteHits.forEach((h) => {
    h.index = process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX;
    allHits.push(h);
  });

  themeHits.forEach((h) => {
    h.index = process.env.REACT_APP_ALGOLIA_THEMES_INDEX;
    allHits.push(h);
  });

  allHits.sort((a, b) => {
    return a.creationTimestamp - b.creationTimestamp;
  });

  const results = allHits.map((hit) => {
    if (hit.index === process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
      return (
        <QuoteHit key={hit.objectID} hit={hit} reactQuillRef={reactQuillRef} />
      );
    }
    if (hit.index === process.env.REACT_APP_ALGOLIA_THEMES_INDEX) {
      return (
        <ThemeHit key={hit.objectID} hit={hit} reactQuillRef={reactQuillRef} />
      );
    }
    return <></>;
  });

  return (
    <>
      {results}
      <div
        ref={(c) => (sentinel.current = c)}
        style={{ height: "1rem", width: "1rem" }}
      ></div>
    </>
  );
}

const CustomSearchBox = ({ currentRefinement, refine }) => {
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
        placeholder="Search..."
        value={currentRefinement}
        onChange={(e) => {
          refine(e.currentTarget.value);
        }}
        InputProps={{
          disableUnderline: true,
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        style={{
          width: "100%",
          margin: "0.5rem",
        }}
      />
    </Grid>
  );
};

const ConnectedAutoComplete = connectAutoComplete(AutoComplete);
const SearchResults = connectInfiniteHits(InfiniteHits);
const SearchBox = connectSearchBox(CustomSearchBox);

function AutoComplete({ reactQuillRef, hits }) {
  let quoteHits;
  let themeHits;
  if (hits) {
    let quoteHitsObj = hits.find((item) => {
      return item.index === process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX;
    });
    quoteHits = quoteHitsObj && quoteHitsObj.hits;

    let themeHitsObj = hits.find((item) => {
      return item.index === process.env.REACT_APP_ALGOLIA_THEMES_INDEX;
    });
    themeHits = themeHitsObj && themeHitsObj.hits;
  }

  return (
    <>
      <SearchBox />
      <SearchResults
        reactQuillRef={reactQuillRef}
        quoteHits={quoteHits}
        themeHits={themeHits}
      />
    </>
  );
}

export default function SummarySidebar({ reactQuillRef }) {
  const searchClient = useSearchClient();

  if (!searchClient) {
    console.debug("search client not available");
    return <Loading />;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  return (
    <Grid
      id="summarySidebarContainer"
      container
      item
      xs={11}
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
        <Scrollable
          id="summary-sidebar-scroll"
          style={{
            background: "#fafafa",
          }}
        >
          <InstantSearch
            searchClient={searchClient}
            indexName={process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX}
          >
            <ConnectedAutoComplete reactQuillRef={reactQuillRef} />
            <Index indexName={process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX} />
            <Index indexName={process.env.REACT_APP_ALGOLIA_THEMES_INDEX} />
          </InstantSearch>
        </Scrollable>
      </Grid>
    </Grid>
  );
}
