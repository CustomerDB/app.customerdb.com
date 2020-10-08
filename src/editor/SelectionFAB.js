import React, { useEffect, useState } from "react";

import Fab from "@material-ui/core/Fab";
import Fade from "@material-ui/core/Fade";
import Grid from "@material-ui/core/Grid";
import Label from "@material-ui/icons/Label";
import LabelOff from "@material-ui/icons/LabelOff";
import Paper from "@material-ui/core/Paper";
import Tags from "./Tags.js";
import Zoom from "@material-ui/core/Zoom";
import { useTheme } from "@material-ui/core/styles";

export default function SelectionFAB({
  toolbarHeight,
  selection,
  tags,
  tagIDsInSelection,
  onTagControlChange,
}) {
  const [browserSelection, setBrowserSelection] = useState();
  const [offsetTop, setOffsetTop] = useState();

  const [showFabAdd, setShowFabAdd] = useState();
  const [showFabClear, setShowFabClear] = useState();
  const [showMenu, setShowMenu] = useState();

  const halfFabHeight = 20;

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

    // Quilljs provides experimental API to get the "line blot"
    // for a given selection index. However, this may refer to
    // a block level element such as a <p> with significant vertical
    // height, which is not sufficient to align our floating control
    // with the user's actual selection.
    //
    // To measure the height of the user's selected text from the top
    // of the scrollable element, we temporarily insert an anonymous
    // DOM node in front of the selection, measure it's offsetTop
    // (which is relative to the nearest enclosing node with
    // position:relative), and then remove it from the DOM again.
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

    if (tagIDsInSelection.size > 0) {
      setShowFabAdd(false);
      setShowFabClear(true);
      return;
    }

    setShowFabClear(false);

    if (selection && selection.length > 0) {
      setShowFabAdd(true);
      return;
    }

    if (!selection || selection.length === 0) {
      setShowFabAdd(false);
      setShowMenu(false);
      return;
    }

    if (browserSelection && browserSelection.isCollapsed) {
      setShowFabAdd(false);
      setShowMenu(false);
    }
  }, [tagIDsInSelection, selection, browserSelection]);

  const expandTagControls = () => {
    setShowFabAdd(false);
    setShowMenu(true);
  };

  const onClear = () => {
    console.debug("clearing highlights in selection");
    tagIDsInSelection.forEach((tagID) => {
      let tag = tags[tagID];
      if (tag) {
        onTagControlChange(tag, false);
      }
    });
    setShowFabAdd(false);
    setShowFabClear(false);
  };

  const transitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen,
  };

  let totalOffset = toolbarHeight - halfFabHeight + offsetTop;

  if (showFabAdd) {
    return (
      <Zoom
        in={showFabAdd}
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
            left: "-3.5rem",
          }}
          color="primary"
          aria-label="expand tag controls"
          onMouseOver={expandTagControls}
          size="medium"
        >
          <Label />
        </Fab>
      </Zoom>
    );
  }

  if (showFabClear) {
    return (
      <Zoom
        in={showFabClear}
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
            left: "-3.5rem",
          }}
          color="primary"
          aria-label="expand tag controls"
          onClick={onClear}
          size="medium"
        >
          <LabelOff />
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
              left: "-3rem",
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