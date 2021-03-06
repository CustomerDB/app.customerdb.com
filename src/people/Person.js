// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import CloseIcon from "@material-ui/icons/Close";
import IconButton from "@material-ui/core/IconButton";
import CreateIcon from "@material-ui/icons/Create";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import ArchiveIcon from "@material-ui/icons/Archive";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import useFirestore from "../db/Firestore.js";
import { useNavigate, useParams } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import PersonEditDialog from "./PersonEditDialog.js";
import PersonDeleteDialog from "./PersonDeleteDialog.js";
import Alert from "@material-ui/lab/Alert";
import Moment from "react-moment";
import PersonOverview from "./PersonOverview";
import { useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import PersonPanel from "./PersonPanel";
import Scrollable from "../shell/Scrollable.js";

const useStyles = makeStyles({
  expand: {
    flexGrow: 1,
  },
});

function Container({ children }) {
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
      direction="column"
    >
      {children}
    </Grid>
  );
}

export default function Person({ edit }) {
  const [editDialogOpen, setEditDialogOpen] = useState(edit);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [person, setPerson] = useState();
  const { orgID } = useParams();
  const { personRef } = useFirestore();
  const classes = useStyles();
  const navigate = useNavigate();

  const theme = useTheme();
  const smBreakpoint = useMediaQuery(theme.breakpoints.down("sm"));

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

  const handleOptionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOptionsClose = () => {
    setAnchorEl(null);
  };

  if (!person) {
    return <></>;
  }

  if (person.deletionTimestamp) {
    let relativeTime = undefined;
    if (person.deletionTimestamp) {
      relativeTime = (
        <Moment fromNow date={person.deletionTimestamp.toDate()} />
      );
    }

    return (
      <Container>
        <Alert severity="error">
          This document was deleted {relativeTime} by {person.deletedBy}
        </Alert>
      </Container>
    );
  }

  console.log("Person", person);

  return (
    <>
      <Container>
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
                  setDeleteDialogOpen(true);
                  setAnchorEl(null);
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
        <Grid
          container
          item
          style={{ position: "relative", flexGrow: 1, width: "100%" }}
        >
          <Scrollable>
            <Grid container style={{ height: "100%" }}>
              <PersonOverview person={person} />
              {!smBreakpoint && <PersonPanel person={person} />}
            </Grid>
          </Scrollable>
        </Grid>
      </Container>
      <PersonEditDialog
        person={person}
        personRef={personRef}
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
      />
      <PersonDeleteDialog
        person={person}
        show={deleteDialogOpen}
        onHide={() => setDeleteDialogOpen(false)}
        personRef={personRef}
      />
    </>
  );
}
