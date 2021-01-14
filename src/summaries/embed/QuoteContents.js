import React, { useContext, useEffect, useRef, useState } from "react";

import ReactDOM from "react-dom";
import { useParams } from "react-router-dom";
import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Moment from "react-moment";
import ReactPlayer from "react-player";
import FirebaseContext from "../../util/FirebaseContext.js";

import useFirestore from "../../db/Firestore.js";

const hexToRGB = (hex) => {
  if (hex.startsWith("#")) hex = hex.slice(1);
  const base = 16;
  const mask = 255;
  const decimal = parseInt(hex, base);
  return {
    r: (decimal >> 16) & mask,
    g: (decimal >> 8) & mask,
    b: decimal & mask,
  };
};

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
  const [exists, setExists] = useState(true);
  const [highlight, setHighlight] = useState();
  const [highlightCache, setHighlightCache] = useState();
  const [mediaURL, setMediaURL] = useState();
  const { allHighlightsRef } = useFirestore();
  const firebase = useContext(FirebaseContext);
  const playerRef = useRef();

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
          setHighlight(doc.data());
          doc.ref
            .collection("cache")
            .doc("hit")
            .onSnapshot((doc) => {
              setHighlightCache(doc.data());
            });
        });
      });
  }, [allHighlightsRef, highlightID, orgID]);

  useEffect(() => {
    if (!firebase || !highlightCache || !highlightCache.mediaPath) {
      return;
    }

    console.debug(
      `Starting to fetch media URL for ${highlightCache.mediaPath}`
    );

    firebase
      .storage()
      .ref()
      .child(highlightCache.mediaPath)
      .getDownloadURL()
      .then((url) => {
        console.debug(`Got url: ${url}`);
        setMediaURL(url);
      });
  }, [highlightCache, firebase]);

  if (!exists) return "Highlight not found";

  if (!highlight || !highlightCache) return <></>;

  let contextPrefix, contextSuffix;

  if (highlightCache.context) {
    const start = highlightCache.startIndex - highlightCache.contextStartIndex;
    const end = highlightCache.endIndex - highlightCache.contextStartIndex;
    contextPrefix = highlightCache.context
      .slice(0, start)
      .replace(/[\r\n]+/g, " ")
      .trimStart();
    contextSuffix = highlightCache.context
      .slice(end)
      .replace(/[\r\n]+/g, " ")
      .trimEnd();
    if (contextPrefix) contextPrefix = `...${contextPrefix}`;
    if (contextSuffix) contextSuffix = `${contextSuffix}...`;
  }

  const rgb = hexToRGB(highlightCache.tagColor);
  const opacity = 0.2;
  const attenuatedHighlightColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

  let documentCreationTimestamp = new Date(
    highlightCache.documentCreationTimestamp * 1000
  );

  return (
    <Card
      key={highlightID}
      elevation={1}
      style={{
        width: "100%",
        margin: "0.5rem",
        borderRadius: "0.5rem",
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
          {highlightCache.documentName}
        </Typography>
        <div>
          {highlightCache.personName && (
            <Avatar
              size={30}
              name={highlightCache.personName}
              round={true}
              src={highlightCache.personImageURL}
              style={{ display: "inline", paddingRight: "0.5rem" }}
            />
          )}
          <p style={{ display: "inline" }}>
            {highlightCache.personName}{" "}
            <Moment fromNow date={documentCreationTimestamp} />
          </p>
        </div>

        {mediaURL && (
          <div
            style={{
              borderRadius: "0.5rem",
              overflow: "hidden",
              margin: "0.5rem",
            }}
          >
            <ReactPlayer
              ref={playerRef}
              url={mediaURL}
              width="100%"
              height="12rem"
              light={highlightCache.thumbnailURL || true}
              playing={true}
              onReady={() => {
                if (
                  highlightCache.startTime &&
                  playerRef.current.getCurrentTime() === 0
                ) {
                  playerRef.current.seekTo(highlightCache.startTime);
                }
              }}
              controls
            />
          </div>
        )}

        <div style={{ margin: "0.5rem" }}>
          <Typography variant="body2" color="textSecondary" component="p">
            <span className="quoteContext">{contextPrefix}</span>
            <span
              style={{
                backgroundColor: attenuatedHighlightColor,
                color: "#000",
              }}
            >
              {highlightCache.text.replace(/[\r\n]+/g, " ")}
            </span>
            <span className="quoteContext">{contextSuffix}</span>
          </Typography>
          <div style={{ paddingTop: "1rem" }}>
            <Chip
              size="small"
              label={highlightCache.tagName}
              style={{
                backgroundColor: highlightCache.tagColor,
                color: highlightCache.tagTextColor,
                fontWeight: "bold",
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
