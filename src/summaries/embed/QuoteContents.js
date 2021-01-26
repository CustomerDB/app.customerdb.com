import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import QuotePreview from "../../quotes/QuotePreview.js";
import Grid from "@material-ui/core/Grid";
import DismissableBlotContent from "./DismissableBlotContent.js";

export default function QuoteContents({ quillContainerRef, reactQuillRef }) {
  const [quoteNodes, setQuoteNodes] = useState([]);

  useEffect(() => {
    const refreshNodes = () => {
      if (!quillContainerRef.current) return;

      let nodes = quillContainerRef.current.getElementsByClassName(
        "direct-quote"
      );

      let newQuoteNodes = [];
      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];
        if (node.dataset.highlightID) {
          newQuoteNodes.push(node);
        }
      }
      setQuoteNodes(newQuoteNodes);
    };
    let interval = setInterval(refreshNodes, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [quillContainerRef]);

  return quoteNodes.map((quoteNode) =>
    ReactDOM.createPortal(
      <QuoteContent quoteNode={quoteNode} reactQuillRef={reactQuillRef} />,
      quoteNode
    )
  );
}

function QuoteContent({ reactQuillRef, quoteNode }) {
  return (
    <Grid
      container
      item
      sm={12}
      md={6}
      style={{
        border: "1px solid #fafafa",
        borderRadius: "1rem",
      }}
    >
      <DismissableBlotContent
        reactQuillRef={reactQuillRef}
        blotNode={quoteNode}
      >
        <QuotePreview
          key={quoteNode.dataset.highlightID}
          highlightID={quoteNode.dataset.highlightID}
        />
      </DismissableBlotContent>
    </Grid>
  );
}
