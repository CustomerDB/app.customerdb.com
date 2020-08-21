import React, { useEffect, useState } from "react";

import Fab from "@material-ui/core/Fab";
import Fade from "@material-ui/core/Fade";
import Grid from "@material-ui/core/Grid";
import InsertCommentIcon from "@material-ui/icons/InsertComment";
import Paper from "@material-ui/core/Paper";
import Tags from "./Tags.js";
import Zoom from "@material-ui/core/Zoom";
import { useTheme } from "@material-ui/core/styles";

export default function SelectionFAB({
  selection,
  quillContainerRef,
  tags,
  tagIDsInSelection,
  onTagControlChange,
}) {
  const [browserSelection, setBrowserSelection] = useState();
  const [offsetTop, setOffsetTop] = useState();

  const [showFab, setShowFab] = useState();
  const [showMenu, setShowMenu] = useState();

  const toolbarHeightPx = 40;
  const halfToolbarHeightPx = toolbarHeightPx / 2;

  const theme = useTheme();

  // Subscribe to native browser selection change events
  // because quilljs does not notify when the editor loses
  // focus.
  useEffect(() => {
    const onSelectionChange = () => {
      setBrowserSelection(document.getSelection());
    };

    document.addEventListener("selectionchange", onSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  useEffect(() => {
    if (!browserSelection || !selection) return;

    let range = browserSelection.getRangeAt(0).cloneRange();
    range.collapse(false);

    let tempSpan = document.createElement("span");

    range.insertNode(tempSpan);
    const tempSpanOffset = tempSpan.offsetTop;
    tempSpan.remove();

    setOffsetTop(tempSpanOffset);
  }, [browserSelection, selection]);

  useEffect(() => {
    if (selection) {
      setBrowserSelection(document.getSelection());
    }

    if (selection && selection.length > 0) {
      setShowFab(true);
      return;
    }

    if (tagIDsInSelection.size > 0) {
      setShowFab(true);
      return;
    }

    if (!selection || selection.length === 0) {
      setShowFab(false);
      setShowMenu(false);
      return;
    }

    if (browserSelection && browserSelection.isCollapsed) {
      setShowFab(false);
      setShowMenu(false);
    }
  }, [tagIDsInSelection, selection, browserSelection]);

  const expandTagControls = () => {
    console.log("fab clicked");
    setShowFab(false);
    setShowMenu(true);
  };

  const transitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen,
  };

  let totalOffset = halfToolbarHeightPx + offsetTop;

  if (showFab) {
    console.log("FAB totalOffset", totalOffset);

    return (
      <Zoom
        in={showFab}
        timeout={transitionDuration}
        style={{
          transitionDelay: "0ms",
        }}
        unmountOnExit
      >
        <Fab
          style={{
            position: "absolute",
            top: `${totalOffset}px`,
            right: "-2.5rem",
          }}
          color="primary"
          aria-label="expand tag controls"
          onMouseOver={expandTagControls}
          size="medium"
        >
          <InsertCommentIcon />
        </Fab>
      </Zoom>
    );
  }

  if (showMenu) {
    return (
      <Fade in={showMenu}>
        <Grid container>
          <Paper
            elevation={3}
            style={{
              position: "absolute",
              top: `${totalOffset}px`,
              right: "-2.5rem",
              minWidth: "12rem",
              zIndex: 250,
            }}
          >
            <Grid container item xs style={{ margin: "1rem" }}>
              <Tags
                tags={tags}
                tagIDsInSelection={tagIDsInSelection}
                onChange={onTagControlChange}
              />
            </Grid>
          </Paper>
        </Grid>
      </Fade>
    );
  }

  return <></>;
}
