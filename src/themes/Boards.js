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

import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Board from "./Board.js";
import Avatar from "@material-ui/core/Avatar";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import EmptyStateHelp from "../util/EmptyStateHelp.js";
import Themes from "./Themes";

function Boards({ create, download }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);

  let { boardsRef } = useFirestore();

  let { orgID, boardID } = useParams();

  const navigate = useNavigate();

  const [boardList, setBoardList] = useState(undefined);

  useEffect(() => {
    if (!boardsRef) {
      return;
    }

    return boardsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        setBoardList(
          snapshot.docs.map((doc) => {
            let data = doc.data();
            data.ID = doc.id;
            return data;
          })
        );
      });
  }, [boardsRef]);

  useEffect(() => {
    if (!create || !boardsRef || !oauthClaims.user_id || !oauthClaims.email) {
      return;
    }

    event(firebase, "create_board", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    boardsRef
      .add({
        name: "Unnamed board",
        documentIDs: [],
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then((doc) => {
        navigate(`/orgs/${orgID}/boards/${doc.id}`);
      });
  }, [create, boardsRef, firebase, navigate, oauthClaims, orgID]);

  if (boardList === undefined) {
    return <></>;
  }

  if (boardList.length === 0) {
    return (
      <EmptyStateHelp
        title="Visually group customer quotes"
        description="Collaborate with your team to find patterns in quotes from customer interviews"
        buttonText="Create quote board"
        path={`/orgs/${orgID}/boards/create`}
      />
    );
  }

  let content;
  if (boardID) {
    content = <Board download={download} />;
  }

  return (
    <Grid container className="fullHeight" style={{ position: "relative" }}>
      <ListContainer sm={3}>
        <Scrollable>
          <List style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
            {boardList.map((board) => (
              <>
                <ListItem
                  button
                  key={board.ID}
                  selected={board.ID === boardID}
                  onClick={() => {
                    navigate(`/orgs/${orgID}/boards/${board.ID}`);
                  }}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                  }}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <BubbleChartIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={board.name}
                    secondary={
                      <Moment
                        fromNow
                        date={
                          board.creationTimestamp &&
                          board.creationTimestamp.toDate()
                        }
                      />
                    }
                  />
                </ListItem>
              </>
            ))}
          </List>
        </Scrollable>
      </ListContainer>
      {content}
    </Grid>
  );
}

export default function WrappedBoards(props) {
  return (
    <Themes>
      <Boards {...props} />
    </Themes>
  );
}
