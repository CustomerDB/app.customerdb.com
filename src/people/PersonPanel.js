import React, { useRef, useEffect, useState } from "react";
import List from "@material-ui/core/List";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";
import Quote from "../quotes/Quote";
import { Search } from "../shell/Search.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import Grid from "@material-ui/core/Grid";
import { connectInfiniteHits, RefinementList } from "react-instantsearch-dom";
import Scrollable from "../shell/Scrollable";
import { InterviewListItem } from "../interviews/InterviewList";
import EmptyStateHelp from "../util/EmptyStateHelp.js";
import { useSearchClient } from "../search/client.js";
import { Loading } from "../util/Utils.js";
import { useParams } from "react-router-dom";
import useFirestore from "../db/Firestore.js";

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
          description="Then search quotes from all of your customer conversations here."
          buttonText="Create interview"
          path={`/orgs/${orgID}/interviews/create`}
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

export default function PersonPanel({ person }) {
  const [docs, setDocs] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);

  const searchClient = useSearchClient();
  const SearchResults = connectInfiniteHits(InfiniteHits);

  const { documentsRef } = useFirestore();

  const { orgID } = useParams();

  useEffect(() => {
    if (!documentsRef || !person) {
      return;
    }

    const personID = person.ID;

    return documentsRef
      .where("deletionTimestamp", "==", "")
      .where("personID", "==", personID)
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newDocs = [];
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newDocs.push(data);
        });
        setDocs(newDocs);
      });
  }, [documentsRef, person]);

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX,
      setShowResults: (value) => {},
    };
  }
  if (!searchClient) {
    return <Loading text="Getting everything set up. One moment" />;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  return (
    <Grid container item xs={12} md={9} lg={9}>
      <Grid container align="baseline" direction="column">
        <Grid
          container
          item
          style={{ paddingTop: "2rem", paddingRight: "2rem" }}
        >
          <Tabs
            value={selectedTab}
            indicatorColor="secondary"
            textColor="secondary"
            style={{
              borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
              width: "100%",
            }}
          >
            <Tab
              label="Quotes"
              id="quotes"
              aria-controls="tabpanel-quotes"
              onClick={() => setSelectedTab(0)}
            />
            <Tab
              label="Interviews"
              id="interviews"
              aria-controls="tabpanel-interviews"
              onClick={() => setSelectedTab(1)}
            />
          </Tabs>
        </Grid>
        <Grid container item style={{ flexGrow: 1 }}>
          <Search search={searchConfig}>
            <RefinementList
              attribute="personID"
              defaultRefinement={[person.ID]}
            />
            <Grid item style={{ flexGrow: "1", position: "relative" }}>
              <Scrollable>
                {selectedTab === 0 && (
                  <Grid container alignItems="baseline">
                    <SearchResults />
                  </Grid>
                )}
                {selectedTab === 1 && (
                  <List>
                    {docs.length === 0 && (
                      <EmptyStateHelp
                        title="Get started by adding an interview"
                        description="Interviews are where it all begins. Add notes and transcripts from your customer conversations here and start creating customer quotes."
                        buttonText="Create interview"
                        path={`/orgs/${orgID}/interviews/create`}
                      />
                    )}
                    {docs.map((doc) => (
                      <InterviewListItem
                        ID={doc.ID}
                        orgID={orgID}
                        name={doc.name}
                        date={
                          doc.creationTimestamp &&
                          doc.creationTimestamp.toDate()
                        }
                        transcript={doc.transcription}
                        personName={doc.personName}
                        personImageURL={doc.personImageURL}
                      />
                    ))}
                  </List>
                )}
              </Scrollable>
            </Grid>
          </Search>
        </Grid>
      </Grid>
    </Grid>
  );
}
