import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import ThemePreview from "../../themes/ThemePreview.js";
import DismissableBlotContent from "./DismissableBlotContent.js";

export default function ThemeContents({ quillContainerRef, reactQuillRef }) {
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

  return themeNodes.map((themeNode) =>
    ReactDOM.createPortal(
      <DismissableBlotContent
        reactQuillRef={reactQuillRef}
        blotNode={themeNode}
      >
        <ThemePreview
          key={themeNode.dataset.highlightID}
          boardID={themeNode.dataset.boardID}
          themeID={themeNode.dataset.themeID}
        />
      </DismissableBlotContent>,
      themeNode
    )
  );
}
