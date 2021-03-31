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
