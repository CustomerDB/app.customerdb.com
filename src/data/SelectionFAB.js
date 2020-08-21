import React, { useEffect, useRef, useState } from "react";

import Fab from "@material-ui/core/Fab";
import InsertCommentIcon from "@material-ui/icons/InsertComment";
import Zoom from "@material-ui/core/Zoom";
import { useTheme } from "@material-ui/core/styles";

export default function SelectionFAB({ editor, selection }) {
  const [offsetTop, setOffsetTop] = useState(0);

  const toolbarHeightPx = 40;
  const halfToolbarHeightPx = toolbarHeightPx / 2;

  const theme = useTheme();

  useEffect(() => {
    if (!editor || !selection) return;

    let [lineBlot, offset] = editor.getLine(selection.index);
    console.log("selection at line number: ", offset);
    console.log("line blot domNode: ", lineBlot.domNode);
    setOffsetTop(lineBlot.domNode.offsetTop);
  }, [editor, selection]);

  const show = selection && selection.length > 0;

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
        transitionDelay: `${show ? transitionDuration.exit : 0}ms`,
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
        size="small"
      >
        <InsertCommentIcon />
      </Fab>
    </Zoom>
  );
}
