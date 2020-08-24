import React, { useState } from "react";

import Chip from "@material-ui/core/Chip";

export default function HighlightHints({ toolbarHeight, highlights, tags }) {
  console.log("render HighlightHints");

  if (!highlights || !tags) {
    return <></>;
  }

  let toolbarOffset = toolbarHeight - 8;

  let hints = Object.values(highlights).map((highlight) => {
    let highlightDomID = `highlight-${highlight.ID}`;
    let hintDomID = `${highlightDomID}-hint`;
    let highlightNode = document.getElementById(highlightDomID);

    if (!highlightNode) return undefined;

    let tagID = highlight.tagID;
    let tag = tags[tagID];

    if (!tag) return <></>;

    return (
      <Hint
        id={hintDomID}
        key={hintDomID}
        tag={tag}
        offsetTop={highlightNode.offsetTop + toolbarOffset}
      />
    );
  });

  return hints;
}

function Hint({ tag, offsetTop }) {
  const [expand, setExpand] = useState(false);

  let label = expand ? tag.name : tag.name[0];

  let chip = (
    <Chip
      label={label}
      onMouseOver={() => {
        setExpand(true);
      }}
      onMouseOut={() => {
        setExpand(false);
      }}
      style={{
        background: tag.color,
        color: tag.textColor,
        position: "absolute",
        top: offsetTop,
        right: "-3rem",
      }}
    />
  );

  return chip;
}
