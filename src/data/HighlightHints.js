import React, { useEffect, useState } from "react";

import Chip from "@material-ui/core/Chip";

export default function HighlightHints({ highlights, tags }) {
  console.log("render HighlightHints");

  const [area, setArea] = useState(0);

  // Subscribe to window resize events because hint offsets need to be
  // recomputed if the browser zoom level changes.
  useEffect(() => {
    const onResize = () => {
      setArea(window.innerWidth * window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  if (!highlights || !tags) {
    return <></>;
  }

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
        key={`${hintDomID}-${area}`}
        tag={tag}
        offsetTop={highlightNode.offsetTop + 32}
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
