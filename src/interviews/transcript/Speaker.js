import React, { useRef, useState } from "react";

import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import ContentEditable from "react-contenteditable";
import Delta from "quill-delta";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import PersonIcon from "@material-ui/icons/Person";
import Popover from "@material-ui/core/Popover";
import Quill from "quill";
import useFirestore from "../../db/Firestore.js";

export default function Speaker({
  speakerNode,
  quillRef,
  speakers,
  speakerID,
  transcriptionID,
}) {
  const { transcriptionsRef } = useFirestore();
  const [popOpen, setPopOpen] = useState(false);

  let speakerName = "Unknown speaker";
  if (speakerID) {
    speakerName = `Speaker ${speakerID}`;
    if (speakers && speakers[speakerID] && speakers[speakerID].name) {
      speakerName = speakers[speakerID].name;
    }
  }

  const chipRef = useRef();
  const popName = useRef(speakerName);

  if (!speakers) {
    return <></>;
  }

  // TODO(CD): if photoURL is available, set Avatar alt and src instead
  let avatar = <Avatar alt={speakerName} />;

  const onClick = (e) => {
    if (!popOpen) {
      popName.current = speakerName;
      setPopOpen(true);
    }
  };

  const onPopClose = () => {
    setPopOpen(false);
  };

  const onPopNameChange = (e) => {
    popName.current = e.target.value;
  };

  const onClickRename = (e) => {
    if (!transcriptionsRef) {
      return;
    }
    const speakerRef = transcriptionsRef
      .doc(transcriptionID)
      .collection("speakers")
      .doc(speakerID);
    speakerRef.set({ name: popName.current }, { merge: true });
  };

  const setSpeakerID = (newID) => {
    if (!quillRef.current) return;
    let editor = quillRef.current.getEditor();
    let blot = Quill.find(speakerNode);
    if (!blot) return;
    let index = editor.getIndex(blot);
    let rewriteSpeakerDelta = new Delta([
      { retain: index },
      { delete: 1 },
      { insert: { speaker: { ID: newID } } },
    ]);
    editor.updateContents(rewriteSpeakerDelta, "user");
  };

  let speakerOptions = Object.values(speakers).map((speaker) => {
    return (
      <ListItem
        key={speaker.ID}
        button
        onClick={() => {
          setSpeakerID(speaker.ID);
        }}
      >
        <ListItemIcon>
          <PersonIcon />
        </ListItemIcon>
        <ListItemText primary={speaker.name || `Speaker ${speaker.ID}`} />
      </ListItem>
    );
  });

  return (
    <>
      <Chip
        ref={chipRef}
        spellCheck="false"
        avatar={avatar}
        label={speakerName}
        variant="outlined"
        onClick={onClick}
      />
      <Popover
        open={popOpen}
        anchorEl={chipRef.current}
        onClose={onPopClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Paper elevation={9}>
          <Grid
            container
            style={{ width: "20rem", padding: "1rem" }}
            spacing={0}
          >
            <Grid container item xs={12} justify="space-between" spacing={0}>
              <Grid item xs={8}>
                <ContentEditable
                  style={{
                    border: "1px solid rgba(0, 0, 0, 0.23)",
                    borderRadius: "0.25rem",
                    height: "1.9rem",
                    lineHeight: "1.9rem",
                    fontSize: "1rem",
                  }}
                  html={popName.current}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.target.blur();
                      e.preventDefault();
                      onClickRename();
                      onPopClose();
                    }
                  }}
                  onChange={onPopNameChange}
                />
              </Grid>
              <Grid item xs={3}>
                <Button
                  color="primary"
                  variant="outlined"
                  size="small"
                  onClick={onClickRename}
                  disableElevation
                >
                  Rename
                </Button>
              </Grid>
            </Grid>

            <Grid container item xs={12} spacing={0}>
              <List style={{ width: "100%" }}>{speakerOptions}</List>
            </Grid>
          </Grid>
        </Paper>
      </Popover>
    </>
  );
}
