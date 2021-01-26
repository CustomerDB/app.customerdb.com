import React, { useCallback, useState } from "react";
import IconButton from "@material-ui/core/IconButton";
import Tooltip from "@material-ui/core/Tooltip";
import Fade from "@material-ui/core/Fade";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { deleteBlot } from "./insert.js";

export default function DismissableBlotContent({
  reactQuillRef,
  blotNode,
  children,
}) {
  const [hover, setHover] = useState(false);

  const onDismiss = useCallback(() => {
    deleteBlot(reactQuillRef, blotNode);
  }, [reactQuillRef, blotNode]);

  return (
    <div
      style={{
        position: "relative",
      }}
      onMouseEnter={() => {
        setHover(true);
      }}
      onMouseLeave={() => {
        setHover(false);
      }}
    >
      {children}
      <Fade in={hover}>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
          }}
        >
          <Tooltip title="Remove">
            <span>
              <IconButton onClick={onDismiss}>
                <HighlightOffIcon />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </Fade>
    </div>
  );
}
