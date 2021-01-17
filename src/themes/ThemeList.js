import React, { useEffect, useRef } from "react";

import Grid from "@material-ui/core/Grid";
import { connectInfiniteHits } from "react-instantsearch-dom";

import Typography from "@material-ui/core/Typography";
import Moment from "react-moment";

import { Search } from "../shell/Search.js";
import { useNavigate } from "react-router-dom";
import QuotePreview from "../quotes/QuotePreview.js";

function ThemeHit({ hit }) {
  const navigate = useNavigate();

  let themeCreationTimestamp = new Date(hit.creationTimestamp * 1000);

  // card IDs are 1:1 correspondence with highlight IDs
  const quotePreviews = hit.cardIDs.map((cardID) => {
    return <QuotePreview key={cardID} highlightID={cardID} hideNotFound />;
  });

  const card = (
    <Grid
      container
      item
      xs={12}
      key={hit.objectID}
      style={{
        margin: "1rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        width: "100%",
      }}
      onClick={() => {
        navigate(`/orgs/${hit.orgID}/boards/${hit.boardID}`);
      }}
    >
      <Grid container item xs={12}>
        <Grid container item xs={12}>
          <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
            {hit.name}
          </Typography>
        </Grid>
        <Grid container item xs={12}>
          <p>
            {hit.boardName} <Moment fromNow date={themeCreationTimestamp} />
          </p>
        </Grid>
      </Grid>
      <Grid xs={12} container item>
        {quotePreviews}
      </Grid>
    </Grid>
  );

  return card;
}

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

  console.debug("hits", hits);

  const sentinelNode = (
    <div
      className="sentinel"
      ref={sentinel}
      style={{ height: "1rem", width: "1rem" }}
    ></div>
  );

  if (hits.length === 0) {
    return sentinelNode;
  }

  const results = hits.map((hit) => <ThemeHit key={hit.objectID} hit={hit} />);

  return (
    <>
      {results}
      {sentinelNode}
    </>
  );
}

const SearchResults = connectInfiniteHits(InfiniteHits);

export default function ThemeList() {
  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_THEMES_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_THEMES_INDEX,
      setShowResults: (value) => {},
    };
  }

  return (
    <Grid
      container
      item
      className="fullHeight"
      xs={12}
      style={{
        background: "#fafafa",
      }}
    >
      <Search search={searchConfig}>
        <Grid container item alignItems="baseline">
          <SearchResults />
        </Grid>
      </Search>
    </Grid>
  );
}
