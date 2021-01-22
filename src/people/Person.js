import React, { useEffect, useState, useRef } from "react";

import Grid from "@material-ui/core/Grid";
import CloseIcon from "@material-ui/icons/Close";
import IconButton from "@material-ui/core/IconButton";
import CreateIcon from "@material-ui/icons/Create";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ArchiveIcon from "@material-ui/icons/Archive";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import Avatar from "react-avatar";
import List from "@material-ui/core/List";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useTheme } from "@material-ui/core/styles";
import Quote from "../quotes/Quote";
import { Search } from "../shell/Search.js";
import Tab from "@material-ui/core/Tab";
import Tabs from "@material-ui/core/Tabs";
import RoomIcon from "@material-ui/icons/Room";
import WorkIcon from "@material-ui/icons/Work";
import Typography from "@material-ui/core/Typography";
import useFirestore from "../db/Firestore.js";
import { useNavigate, useParams } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import ApartmentIcon from "@material-ui/icons/Apartment";
import EmailIcon from "@material-ui/icons/Email";
import PhoneIcon from "@material-ui/icons/Phone";
import EmptyStateHelp from "../util/EmptyStateHelp.js";
import { useSearchClient } from "../search/client.js";
import { Loading } from "../util/Utils.js";
import { connectInfiniteHits, RefinementList } from "react-instantsearch-dom";
import Scrollable from "../shell/Scrollable";
import { InterviewListItem } from "../interviews/InterviewList";
import PersonEditDialog from "./PersonEditDialog.js";

const useStyles = makeStyles({
  expand: {
    flexGrow: 1,
  },
});

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

export default function Person() {
  const [editDialogOpen, setEditDialogOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [docs, setDocs] = useState([]);
  const [person, setPerson] = useState();
  const [selectedTab, setSelectedTab] = useState(0);
  const { documentsRef } = useFirestore();
  const { orgID } = useParams();
  const { personRef } = useFirestore();
  const classes = useStyles();
  const navigate = useNavigate();

  const searchClient = useSearchClient();

  useEffect(() => {
    if (!personRef) {
      return;
    }
    return personRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }
      let person = doc.data();
      person.ID = doc.id;
      setPerson(person);
    });
  }, [personRef, navigate]);

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

  if (!searchClient) {
    console.error("search client not available");
    return <Loading text="Getting everything set up. One moment" />;
  }
  if (!process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    console.error("highlights index not set");
    return <></>;
  }

  const SearchResults = connectInfiniteHits(InfiniteHits);

  const handleOptionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionsClose = () => {
    setAnchorEl(null);
  };

  if (!person) {
    return <></>;
  }

  let searchConfig;
  if (process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX) {
    searchConfig = {
      index: process.env.REACT_APP_ALGOLIA_HIGHLIGHTS_INDEX,
      setShowResults: (value) => {},
    };
  }

  const address = [person.city, person.state, person.country]
    .flatMap((item) => (item ? [item] : []))
    .join(", ");

  console.log("Person", person);

  return (
    <>
      <Grid
        container
        item
        xs={12}
        spacing={0}
        style={{
          backgroundColor: "#f9f9f9",
          position: "absolute",
          height: "100%",
        }}
        align="baseline"
        direction="column"
      >
        <Grid container>
          <Grid container item className={classes.exand}></Grid>
          <Grid container item justify="flex-end">
            <IconButton
              id="document-options"
              edge="end"
              aria-label="document options"
              aria-haspopup="true"
              aria-controls="document-menu"
              onClick={handleOptionsClick}
              color="inherit"
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="profile-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleOptionsClose}
            >
              <MenuItem
                id="edit-person"
                onClick={() => {
                  // edit modal
                  setEditDialogOpen(true);
                  setAnchorEl(null);
                }}
              >
                <ListItemIcon>
                  <CreateIcon />
                </ListItemIcon>
                Edit
              </MenuItem>
              <MenuItem
                id="archive-person"
                onClick={() => {
                  setAnchorEl(null);
                  // archive modal
                }}
              >
                <ListItemIcon>
                  <ArchiveIcon />
                </ListItemIcon>
                Archive
              </MenuItem>
            </Menu>
            <IconButton
              onClick={() => {
                navigate(`/orgs/${orgID}/people`);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </Grid>
        <Grid container style={{ flexGrow: 1 }}>
          <Grid
            container
            item
            xs={12}
            md={3}
            lg={3}
            style={{ padding: "2rem" }}
          >
            <Grid container direction="column">
              <Grid
                container
                item
                style={{
                  marginBottom: "2rem",
                  padding: "2rem",
                  background: "white",
                }}
                justify="center"
              >
                <Grid container item justify="center">
                  <Grid icontainer item xs={12} style={{ textAlign: "center" }}>
                    <Avatar
                      size={150}
                      name={person.name}
                      src={person.imageURL}
                      round={true}
                      style={{ marginBottom: "1rem" }}
                    />
                  </Grid>
                  <Grid container item xs={12} justify="center">
                    <Typography
                      variant="h6"
                      style={{ fontWeight: "bold" }}
                      gutterBottom
                    >
                      {person.name}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid
                container
                item
                style={{
                  marginBottom: "2rem",
                  padding: "2rem",
                  background: "white",
                }}
                justify="center"
              >
                <Table>
                  <TableBody>
                    {person.job && (
                      <TableRow>
                        <TableCell style={{ width: "3rem" }}>
                          <WorkIcon />
                        </TableCell>
                        <TableCell>{person.job}</TableCell>
                      </TableRow>
                    )}
                    {person.company && (
                      <TableRow>
                        <TableCell style={{ width: "3rem" }}>
                          <ApartmentIcon />
                        </TableCell>
                        <TableCell>{person.company}</TableCell>
                      </TableRow>
                    )}
                    {person.email && (
                      <TableRow>
                        <TableCell style={{ width: "3rem" }}>
                          <EmailIcon />
                        </TableCell>
                        <TableCell>{person.email}</TableCell>
                      </TableRow>
                    )}
                    {person.phone && (
                      <TableRow>
                        <TableCell style={{ width: "3rem" }}>
                          <PhoneIcon />
                        </TableCell>
                        <TableCell>{person.phone}</TableCell>
                      </TableRow>
                    )}
                    {address && (
                      <TableRow>
                        <TableCell style={{ width: "3rem" }}>
                          <RoomIcon />
                        </TableCell>
                        <TableCell>{address}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Grid>
            </Grid>
          </Grid>
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
        </Grid>
      </Grid>
      <PersonEditDialog
        personRef={personRef}
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
      />
    </>
  );
}
