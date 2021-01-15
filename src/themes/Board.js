import { useParams, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useCallback } from "react";

import BoardCanvas from "./BoardCanvas.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import BoardDeleteModal from "./BoardDeleteModal.js";
import ArchiveIcon from "@material-ui/icons/Archive";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import ContentEditable from "react-contenteditable";
import Tooltip from "@material-ui/core/Tooltip";
import InterviewSidepane from "./InterviewSidepane.js";
import Sidepane from "../shell/Sidepane.js";
import QuoteSidepane from "./QuoteSidepane.js";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  paper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    margin: "1rem",
    padding: "1rem",
  },
  view: {
    position: "relative",
    flexGrow: 1,
  },
});

export default function Board() {
  let { boardRef } = useFirestore();
  const { orgID } = useParams();
  const [showDeleteModal, setShowDeleteModal] = useState();
  const [interviewsSidepaneOpen, setInterviewsSidepaneOpen] = useState(false);

  const [sidepaneHighlight, setSidepaneHighlight] = useState(undefined);

  const navigate = useNavigate();

  const [board, setBoard] = useState();

  const classes = useStyles();

  useEffect(() => {
    if (!boardRef) {
      return;
    }

    return boardRef.onSnapshot((doc) => {
      let data = doc.data();
      data.ID = doc.id;
      setBoard(data);
    });
  }, [boardRef]);

  const onAdd = useCallback(
    (documentID) => {
      if (!boardRef || !board || !documentID) {
        return;
      }

      let documentIDs = board.documentIDs || [];
      documentIDs.push(documentID);

      boardRef.update({
        documentIDs: documentIDs,
      });
    },
    [boardRef, board]
  );

  if (!board) {
    return <Loading />;
  }

  // Give a hint if this board was deleted while in view.
  if (board.deletionTimestamp !== "") {
    let relativeTime = (
      <Moment fromNow date={board.deletionTimestamp.toDate()} />
    );

    return (
      <Grid
        container
        item
        sm={9}
        xl={10}
        spacing={0}
        style={{
          backgroundColor: "white",
          position: "absolute",
          height: "100%",
        }}
      >
        <Paper className={classes.paper} elevation={0}>
          <Grid container>
            <Grid container item xs={12} alignItems="flex-start">
              <Grid item xs={11}>
                <Typography
                  gutterBottom
                  variant="h6"
                  style={{ fontWeight: "bold" }}
                  component="h2"
                >
                  {board.name}
                </Typography>
                <p>
                  This board was deleted {relativeTime} by {board.deletedBy}
                </p>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    );
  }

  return (
    <>
      <Grid
        container
        item
        xs={12}
        spacing={0}
        style={{
          backgroundColor: "white",
          position: "absolute",
          height: "100%",
        }}
      >
        <Paper className={classes.paper} elevation={0}>
          <>
            <Grid
              container
              item
              xs={12}
              alignItems="flex-start"
              style={{ maxHeight: "3rem" }}
            >
              <Grid item xs={9}>
                <Typography
                  gutterBottom
                  variant="h6"
                  style={{ fontWeight: "bold" }}
                  component="h2"
                >
                  <ContentEditable
                    html={board.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.target.blur();
                      }
                    }}
                    onBlur={(e) => {
                      if (boardRef) {
                        let newName = e.target.innerText
                          .replace(/(\r\n|\n|\r)/gm, " ")
                          .replace(/\s+/g, " ")
                          .trim();

                        boardRef.update({ name: newName });
                      }
                    }}
                  />
                </Typography>
              </Grid>
              <Grid container item xs={3} justify="flex-end">
                <Tooltip title="Select interviews">
                  <IconButton
                    onClick={() => {
                      setInterviewsSidepaneOpen(true);
                    }}
                  >
                    <RecordVoiceOverIcon />
                  </IconButton>
                </Tooltip>

                <IconButton
                  color="primary"
                  aria-label="Archive document"
                  onClick={() => {
                    setShowDeleteModal(true);
                  }}
                >
                  <ArchiveIcon />
                </IconButton>
                <IconButton
                  onClick={() => {
                    navigate(`/orgs/${orgID}/boards`);
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Grid>
            </Grid>
            <BoardDeleteModal
              show={showDeleteModal}
              onHide={() => {
                setShowDeleteModal(false);
              }}
              boardRef={boardRef}
              board={board}
            />
          </>
          <BoardCanvas
            board={board}
            setSidepaneOpen={setInterviewsSidepaneOpen}
            setSidepaneHighlight={setSidepaneHighlight}
          />
          <Sidepane
            title="Select interviews"
            open={interviewsSidepaneOpen}
            setOpen={setInterviewsSidepaneOpen}
          >
            <InterviewSidepane board={board} onAdd={onAdd} />
          </Sidepane>
          <Sidepane
            title="Quote"
            open={!!sidepaneHighlight}
            setOpen={setSidepaneHighlight}
          >
            <QuoteSidepane highlight={sidepaneHighlight} />
          </Sidepane>
        </Paper>
      </Grid>
    </>
  );
}
