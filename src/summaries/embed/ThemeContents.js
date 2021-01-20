import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import ThemePreview from "../../themes/ThemePreview.js";

export default function ThemeContents({ quillContainerRef }) {
  const [themeNodes, setThemeNodes] = useState([]);

  useEffect(() => {
    const refreshNodes = () => {
      if (!quillContainerRef.current) return;

      let nodes = quillContainerRef.current.getElementsByClassName(
        "embed-theme"
      );

      let newThemeNodes = [];
      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (node.dataset.boardID && node.dataset.themeID) {
          newThemeNodes.push(node);
        }
      }
      setThemeNodes(newThemeNodes);
    };
    let interval = setInterval(refreshNodes, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [quillContainerRef]);

  return themeNodes.map((qn) =>
    ReactDOM.createPortal(
      <ThemePreview
        key={qn.dataset.highlightID}
        boardID={qn.dataset.boardID}
        themeID={qn.dataset.themeID}
      />,
      qn
    )
  );
}
