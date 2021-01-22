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

// import Archive from "@material-ui/icons/Archive";
// import Badge from "react-bootstrap/Badge";
// import Card from "@material-ui/core/Card";
// import CardContent from "@material-ui/core/CardContent";
// import Col from "react-bootstrap/Col";
// import Create from "@material-ui/icons/Create";
// import Grid from "@material-ui/core/Grid";
// import ImageDialog from "./ImageDialog.js";
// import Linkify from "react-linkify";
// import { Loading } from "../util/Utils.js";
// import PersonData from "./PersonData.js";
// import PersonDeleteDialog from "./PersonDeleteDialog.js";
// import PersonEditDialog from "./PersonEditDialog.js";
// import PersonHighlightsPane from "./PersonHighlightsPane.js";
// import Row from "react-bootstrap/Row";
// import Scrollable from "../shell/Scrollable.js";
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

// const useStyles = makeStyles({
//   nameCard: {
//     margin: "0.5rem",
//     padding: "0.5rem",
//     textAlign: "center",
//     alignItems: "center",
//   },
//   contactCard: {
//     overflowWrap: "break-word",
//     margin: "0.5rem",
//     padding: "0.5rem",
//   },
//   main: {
//     margin: "0.5rem",
//     padding: "0.5rem",
//   },
// });

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
  const { personRef } = useFirestore();
  const classes = useStyles();
  const navigate = useNavigate();
  const { orgID } = useParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const [person, setPerson] = useState();
  const [selectedTab, setSelectedTab] = useState(0);

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
        <Grid container item xs={12} md={3} lg={3} style={{ padding: "2rem" }}>
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
                <RefinementList attribute="personName" />
                {/* <Grid item style={{ height: "10rem" }}>
                <SearchResults />
              </Grid> */}
              </Search>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}

// function OldPerson(props) {
//   const { personRef } = useFirestore();
//   const [person, setPerson] = useState();

//   const [showLabels, setShowLabels] = useState(false);
//   const [showContact, setShowContact] = useState(false);

//   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
//   const [showEditDialog, setShowEditDialog] = useState(false);

//   const [imageDialogOpen, setImageDialogOpen] = useState(false);

//   const classes = useStyles();

//   useEffect(() => {
//     if (!personRef) {
//       return;
//     }
//     return personRef.onSnapshot((doc) => {
//       if (!doc.exists) {
//         navigate("/404");
//         return;
//       }
//       let person = doc.data();
//       person.ID = doc.id;
//       setPerson(person);
//     });
//   }, [personRef, navigate]);

//   useEffect(() => {
//     if (!person) {
//       return;
//     }
//     setShowLabels(person.labels && Object.values(person.labels).length > 0);

//     setShowContact(
//       person.email ||
//         person.phone ||
//         person.state ||
//         person.city ||
//         person.country ||
//         (person.customFields && Object.keys(person.customFields).length > 0)
//     );
//     console.log(person);
//   }, [person]);

//   if (!person) {
//     return <Loading />;
//   }

//   let editDialog = (
//     <PersonEditDialog
//       show={showEditDialog}
//       onHide={() => setShowEditDialog(false)}
//       personRef={personRef}
//     />
//   );
//   let deleteDialog = (
//     <PersonDeleteDialog
//       show={showDeleteDialog}
//       onHide={() => setShowDeleteDialog(false)}
//       personRef={personRef}
//     />
//   );

//   return (
//     <>
//       <Grid
//         container
//         item
//         xs={12}
//         spacing={0}
//         style={{
//           backgroundColor: "#f9f9f9",
//           position: "absolute",
//           height: "100%",
//         }}
//       >
//         <Grid container item xs={12} justify="flex-end">
//           <IconButton
//             onClick={() => {
//               // TODO: Communicate with parent component instead of using navigate.
//               navigate(`/orgs/${orgID}/people`);
//             }}
//             color="inherit"
//           >
//             <CloseIcon />
//           </IconButton>
//         </Grid>
//         <Grid
//           container
//           item
//           md={4}
//           xl={3}
//           direction="column"
//           justify="flex-start"
//           alignItems="stretch"
//           spacing={0}
//           style={{
//             overflowX: "hidden",
//             paddingTop: "1rem",
//           }}
//         >
//           <Card className={classes.nameCard}>
//             <CardContent>
//               <div style={{ position: "relative" }}>
//                 <Avatar
//                   size={70}
//                   name={person.name}
//                   src={person.imageURL}
//                   round={true}
//                 />
//                 <div
//                   class="profileImageCover"
//                   onClick={() => {
//                     setImageDialogOpen(true);
//                   }}
//                 >
//                   Upload
//                 </div>
//               </div>
//               <ImageDialog
//                 open={imageDialogOpen}
//                 setOpen={setImageDialogOpen}
//               />
//               <Typography
//                 gutterBottom
//                 variant="h6"
//                 style={{ fontWeight: "bold" }}
//                 component="h2"
//               >
//                 {person.name}
//               </Typography>
//               <Typography variant="body2" color="textSecondary" component="p">
//                 {person.job}
//                 <br />
//                 {person.company}
//               </Typography>
//               <div
//                 style={{
//                   display: "flex",
//                   justifyContent: "center",
//                   marginTop: "0.5rem",
//                 }}
//               >
//                 <IconButton
//                   color="primary"
//                   aria-label="Archive person"
//                   component="span"
//                   onClick={() => setShowDeleteDialog(true)}
//                 >
//                   <Archive />
//                 </IconButton>
//                 <IconButton
//                   color="primary"
//                   aria-label="Edit person"
//                   component="span"
//                   onClick={() => setShowEditDialog(true)}
//                 >
//                   <Create />
//                 </IconButton>
//               </div>
//             </CardContent>
//           </Card>
//           {showContact && (
//             <Card className={classes.contactCard}>
//               <Typography gutterBottom variant="h6" component="h2">
//                 Contact
//               </Typography>
//               {person.email && (
//                 <Field name="Email">{<Linkify>{person.email}</Linkify>}</Field>
//               )}
//               <Field name="Phone">{person.phone}</Field>
//               <Field name="Country">{person.country}</Field>
//               <Field name="State">{person.state}</Field>
//               <Field name="City">{person.city}</Field>
//               {person.customFields &&
//                 Object.values(person.customFields).map((field) => (
//                   <Field name={field.kind}>
//                     <Linkify>{field.value}</Linkify>
//                   </Field>
//                 ))}
//             </Card>
//           )}
//           {showLabels && (
//             <Card className={classes.contactCard}>
//               <Typography gutterBottom variant="h6" component="h2">
//                 Labels
//               </Typography>
//               <Field>
//                 {Object.values(person.labels).map((label) => {
//                   return <Label name={label.name} />;
//                 })}
//               </Field>
//             </Card>
//           )}
//           <PersonData person={person} />
//         </Grid>

//         <Grid
//           style={{ position: "relative", height: "100%" }}
//           container
//           item
//           sm={12}
//           md={8}
//           xl={9}
//         >
//           <Scrollable>
//             <Grid container item spacing={0} xs={12}>
//               <PersonHighlightsPane person={person} />
//             </Grid>
//           </Scrollable>
//         </Grid>
//         {editDialog}
//         {deleteDialog}
//       </Grid>
//     </>
//   );
// }

// function Label(props) {
//   return (
//     <Badge
//       key={props.name}
//       pill
//       variant="secondary"
//       style={{ marginRight: "0.5rem" }}
//     >
//       {props.name}
//     </Badge>
//   );
// }

// function Field(props) {
//   if (!props.children) {
//     return <></>;
//   }

//   return (
//     <Row key={props.name} noGutters={true}>
//       <Col>
//         <p style={{ margin: 0 }}>
//           <small>{props.name}</small>
//         </p>
//         <p>{props.children}</p>
//       </Col>
//     </Row>
//   );
// }
