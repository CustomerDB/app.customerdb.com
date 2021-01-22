import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import QuotePreview from "../../quotes/QuotePreview.js";
import Grid from "@material-ui/core/Grid";

export default function QuoteContents({ quillContainerRef }) {
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

  return quoteNodes.map((qn) =>
    ReactDOM.createPortal(
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
        <QuotePreview
          key={qn.dataset.highlightID}
          highlightID={qn.dataset.highlightID}
        />
      </Grid>,
      qn
    )
  );
}
