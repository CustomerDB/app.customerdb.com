import React, { useEffect, useState } from "react";

import Fab from "@material-ui/core/Fab";
import InsertCommentIcon from "@material-ui/icons/InsertComment";
import Zoom from "@material-ui/core/Zoom";
import { useTheme } from "@material-ui/core/styles";

export default function SelectionFAB({ editor, selection, quillContainerRef }) {
  const [show, setShow] = useState();
  const [offsetTop, setOffsetTop] = useState();

  const toolbarHeightPx = 40;
  const halfToolbarHeightPx = toolbarHeightPx / 2;

  const theme = useTheme();

  useEffect(() => {
    const onEditorBlur = () => {
      console.debug("editor blurred");
      if (document.getSelection().isCollapsed) {
        setShow(false);
      }
    };

    document.addEventListener("selectionchange", onEditorBlur);

    return () => {
      document.removeEventListener("selectionchange", onEditorBlur);
    };
  }, []);

  useEffect(() => {
    if (!editor || !selection || selection.length === 0) {
      setShow(false);
      return;
    }

    let browserSelection = document.getSelection();

    let range = browserSelection.getRangeAt(0).cloneRange();
    range.collapse(false);

    let tempSpan = document.createElement("span");

    range.insertNode(tempSpan);
    const tempSpanOffset = tempSpan.offsetTop;
    tempSpan.remove();

    setOffsetTop(tempSpanOffset);
    setShow(true);
  }, [editor, selection]);

  if (!show) {
    return <></>;
  }

  const expandTagControls = () => {
    console.log("fab clicked");
  };

  let totalOffset = halfToolbarHeightPx + offsetTop;

  const transitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen,
  };

  return (
    <Zoom
      in={show}
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
          right: "-3rem",
        }}
        color="primary"
        aria-label="expand tag controls"
        onClick={expandTagControls}
        size="medium"
      >
        <InsertCommentIcon />
      </Fab>
    </Zoom>
  );
}
