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

import React, { useState, useEffect, useCallback } from "react";

import { InstantSearch, connectAutoComplete } from "react-instantsearch-dom";
import { useSearchClient } from "../search/client.js";
import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import DeleteIcon from "@material-ui/icons/Delete";
import InputAdornment from "@material-ui/core/InputAdornment";
import TextField from "@material-ui/core/TextField";
import AddIcon from "@material-ui/icons/Add";
import SearchIcon from "@material-ui/icons/Search";
import Grid from "@material-ui/core/Grid";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Box from "@material-ui/core/Box";
import DescriptionIcon from "@material-ui/icons/Description";
import IconButton from "@material-ui/core/IconButton";
import useFirestore from "../db/Firestore.js";
import TheatersIcon from "@material-ui/icons/Theaters";
import Tooltip from "@material-ui/core/Tooltip";
import Moment from "react-moment";
import { Loading } from "../util/Utils.js";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  avatar: {
    width: "40px",
    height: "40px",
    marginRight: "1rem",
  },
}));

const Autocomplete = ({
  hits,
  currentRefinement,
  refine,
  searchState,
  onAdd,
  selectedDocumentIDs,
}) => {
  const classes = useStyles();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", width: "100%", height: "2.5rem" }}>
      <ClickAwayListener
        onClickAway={() => {
          setOpen(false);
        }}
      >
        <Box
          component={Grid}
          container
          boxShadow={open ? 3 : 0}
          style={{
            position: "fixed",
            background: "white",
            paddingLeft: "0.5rem",
            height: open ? "" : "2rem",
            borderRadius: "0.5rem",
            zIndex: open ? "100" : "",
            maxWidth: "25rem",
            width: "60%",
            minWidth: "15rem",
            transition: "height 0.25s, box-shadow 0.25s",
            overflow: open ? "auto" : "hidden",
            color: "black",
          }}
        >
          <Grid container>
            <Grid container item xs={12}>
              <TextField
                placeholder="Search..."
                value={currentRefinement}
                onClick={() => {
                  setOpen(true);
                }}
                onChange={(event) => {
                  refine(event.currentTarget.value);
                }}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            {hits.length > 0 && (
              <Grid
                container
                item
                xs={12}
                style={{
                  paddingTop: "0.5rem",
                  paddingLeft: "2rem",
                  paddingRight: "2rem",
                }}
              >
                {hits.map((hit) => {
                  if (selectedDocumentIDs.includes(hit.objectID)) {
                    return <></>;
                  }

                  let avatar = (
                    <Avatar className={classes.avatar} alt={hit.personName}>
                      <DescriptionIcon />
                    </Avatar>
                  );

                  if (hit.personImageURL) {
                    avatar = (
                      <Avatar
                        className={classes.avatar}
                        alt={hit.personName}
                        src={hit.personImageURL}
                      />
                    );
                  }

                  if (hit.personName) {
                    avatar = <Tooltip title={hit.personName}>{avatar}</Tooltip>;
                  }

                  return (
                    <Grid
                      container
                      item
                      xs={12}
                      style={{
                        paddingBottom: "0.5rem",
                      }}
                      key={hit.objectID}
                    >
                      <Grid
                        container
                        item
                        xs={1}
                        justify="flex-end"
                        alignItems="center"
                      >
                        {avatar}
                      </Grid>
                      <Grid
                        container
                        item
                        xs={9}
                        justify="flex-start"
                        alignItems="center"
                      >
                        {hit.name}
                      </Grid>
                      <Grid
                        container
                        item
                        xs={2}
                        justify="flex-start"
                        alignItems="center"
                      >
                        <IconButton onClick={() => onAdd(hit.objectID)}>
                          <AddIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Grid>
        </Box>
      </ClickAwayListener>
    </div>
  );
};
const ConnectedAutocomplete = connectAutoComplete(Autocomplete);

function Interview({ documentID, removeDocument }) {
  const [document, setDocument] = useState();

  let { documentsRef } = useFirestore();

  useEffect(() => {
    if (!documentsRef) {
      return;
    }

    return documentsRef.doc(documentID).onSnapshot((doc) => {
      setDocument(doc.data());
    });
  }, [documentsRef, documentID]);

  if (!document) {
    return <></>;
  }

  let personName = document.personName;
  let personImageURL = document.personImageURL;
  let transcript = document.transcription;
  let date = document.creationTimestamp && document.creationTimestamp.toDate();

  let avatar = (
    <Avatar alt={personName}>
      {transcript ? <TheatersIcon /> : <DescriptionIcon />}
    </Avatar>
  );

  if (personImageURL) {
    avatar = <Avatar alt={personName} src={personImageURL} />;
  }

  if (personName) {
    avatar = <Tooltip title={personName}>{avatar}</Tooltip>;
  }

  return (
    <ListItem
      style={{
        backgroundColor: "white",
        borderRadius: "0.5rem",
        marginBottom: "1rem",
      }}
      button
      key={document.ID}
    >
      <ListItemAvatar>{avatar}</ListItemAvatar>
      <ListItemText
        primary={document.name}
        secondary={date && <Moment fromNow date={date} />}
      />
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={() => removeDocument(document.ID)}
        >
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function InterviewSidepane({ board, onAdd }) {
  const { boardRef } = useFirestore();
  const searchClient = useSearchClient();
  const [searchState, setSearchState] = useState({});

  const removeDocument = useCallback(
    (documentID) => {
      if (!board || !board.documentIDs || !boardRef) {
        return;
      }

      let newDocumentIDs = board.documentIDs.slice();
      newDocumentIDs = newDocumentIDs.filter((id) => id !== documentID);
      boardRef.update({
        documentIDs: newDocumentIDs,
      });
    },
    [board, boardRef]
  );

  if (!searchClient) {
    return <Loading />;
  }

  return (
    <>
      <Grid container item style={{ paddingLeft: "2rem" }}>
        <InstantSearch
          searchClient={searchClient}
          indexName={process.env.REACT_APP_ALGOLIA_DOCUMENTS_INDEX}
          searchState={searchState}
          onSearchStateChange={(st) => setSearchState(st)}
        >
          <ConnectedAutocomplete
            searchState={searchState}
            onAdd={onAdd}
            selectedDocumentIDs={board.documentIDs || []}
          />
        </InstantSearch>
      </Grid>
      <Grid
        container
        item
        style={{ backgroundColor: "#f9f9f9", flexGrow: "1" }}
      >
        <List
          style={{
            paddingLeft: "1rem",
            paddingRight: "1rem",
            width: "100%",
          }}
        >
          {(board.documentIDs || "").map((documentID) => (
            <Interview
              documentID={documentID}
              removeDocument={removeDocument}
            />
          ))}
        </List>
      </Grid>
    </>
  );
}
