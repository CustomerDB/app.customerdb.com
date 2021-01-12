import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import { useParams } from "react-router-dom";

import useFirestore from "../../db/Firestore.js";

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
      <QuoteContent
        key={qn.dataset.highlightID}
        highlightID={qn.dataset.highlightID}
      />,
      qn
    )
  );
}

function QuoteContent({ highlightID }) {
  const { orgID } = useParams();
  const [highlight, setHighlight] = useState();
  const [exists, setExists] = useState(true);
  const { allHighlightsRef } = useFirestore();

  useEffect(() => {
    if (!allHighlightsRef) return;

    return allHighlightsRef
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
      .where("ID", "==", highlightID)
      .limit(1)
      .onSnapshot((snapshot) => {
        if (snapshot.size === 0) {
          setExists(false);
          return;
        }
        setExists(true);
        snapshot.forEach((doc) => {
          let highlight = doc.data();
          setHighlight(highlight);
        });
      });
  }, [allHighlightsRef, highlightID, orgID]);

  if (!exists) return "Highlight not found";

  if (!highlight) return <></>;

  return highlight.text;
}
