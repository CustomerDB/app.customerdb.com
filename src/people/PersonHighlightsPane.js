import React, { useEffect, useState } from "react";

import { Bookmark, BookmarkFill } from "react-bootstrap-icons";
import { Loading } from "../util/Utils.js";
import { makeStyles } from "@material-ui/core/styles";
import { useParams, useNavigate } from "react-router-dom";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "@material-ui/core/Card";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  helpText: {
    margin: "1rem",
    padding: "1rem",
  },
  quoteCard: {
    margin: "1rem",
    padding: "0.5rem",
    position: "relative",
    maxWidth: 500,
  },
});

export default function PersonHighlightsPane(props) {
  let { orgID } = useParams();

  const classes = useStyles();

  const [tags, setTags] = useState();
  const [pinnedHighlights, setPinnedHighlights] = useState();
  const [highlights, setHighlights] = useState();

  const { allHighlightsRef, allTagsRef } = useFirestore();

  useEffect(() => {
    if (!allTagsRef) {
      return;
    }

    allTagsRef
      .where("deletionTimestamp", "==", "")
      .where("organizationID", "==", orgID)
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          newTags[doc.id] = doc.data();
        });
        setTags(newTags);
      });
  }, [allTagsRef, orgID]);

  useEffect(() => {
    if (!props.person || !allHighlightsRef) {
      return;
    }

    console.log("props.person", props.person);

    return allHighlightsRef
      .where("personID", "==", props.person.ID)
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newHighlights = [];
        let newPinnedHighlights = [];
        snapshot.forEach((doc) => {
          let highlight = doc.data();
          console.log("highlight", highlight);
          highlight.ID = doc.id;

          if (highlight.pinned) {
            newPinnedHighlights.push(highlight);
            return;
          }
          newHighlights.push(highlight);
        });
        setHighlights(newHighlights);
        setPinnedHighlights(newPinnedHighlights);
      });
  }, [orgID, props.person, allHighlightsRef]);

  if (!highlights || !tags || !pinnedHighlights) {
    return <Loading />;
  }

  console.log("Rendering clips");

  if (highlights.length + pinnedHighlights.length === 0) {
    return (
      <div className={classes.helpText}>
        Clips in linked customer data will appear here. Pin the most important
        clips to build rich customer profiles.
      </div>
    );
  }

  return (
    <>
      {pinnedHighlights.length > 0 && <b>Pinned</b>}
      {pinnedHighlights.map((highlight) => (
        <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
      ))}
      {pinnedHighlights.length > 0 && <hr />}
      {highlights.map((highlight) => (
        <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
      ))}
    </>
  );
}

function HighlightCard(props) {
  const classes = useStyles();

  const { orgID } = useParams();
  const { documentsRef } = useFirestore();
  const navigate = useNavigate();

  if (!props.tag || !props.highlight) {
    return <></>;
  }

  return (
    <Card
      className={classes.quoteCard}
      onClick={() => {
        navigate(`/orgs/${orgID}/data/${props.highlight.documentID}`);
      }}
    >
      <p style={{ paddingRight: "2rem" }}>
        <i>"{props.highlight.text}"</i>
      </p>
      <Button
        title={props.highlight.pinned ? "Unpin" : "Pin"}
        variant="link"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          cursor: "default",
        }}
        onClick={(e) => {
          // Stop event propagation up the DOM tree
          e.stopPropagation();

          if (!documentsRef) {
            return;
          }

          documentsRef
            .doc(props.highlight.documentID)
            .collection("highlights")
            .doc(props.highlight.ID)
            .set(
              {
                pinned: !props.highlight.pinned,
              },
              { merge: true }
            );
        }}
      >
        {props.highlight.pinned ? <BookmarkFill /> : <Bookmark />}
      </Button>
      <div>
        <Badge
          variant="secondary"
          pill
          style={{
            color: props.tag.textColor,
            backgroundColor: props.tag.color,
          }}
        >
          {props.tag.name}
        </Badge>
      </div>
    </Card>
  );
}
