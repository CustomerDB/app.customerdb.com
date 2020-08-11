import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Tabs from "../shell/Tabs.js";
import Scrollable from "../shell/Scrollable.js";

import { Bookmark, BookmarkFill } from "react-bootstrap-icons";

import { useParams } from "react-router-dom";

import { Loading } from "../util/Utils.js";

export default function PersonHighlightsPane(props) {
  let { orgID } = useParams();

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
  }, [allTagsRef]);

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
  }, [props.person, allHighlightsRef]);

  if (!highlights || !tags || !pinnedHighlights) {
    return <Loading />;
  }

  return (
    <Tabs.Content>
      <Scrollable>
        {pinnedHighlights.length > 0 && <b>Pinned</b>}
        {pinnedHighlights.map((highlight) => (
          <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
        ))}
        {pinnedHighlights.length > 0 && <hr />}
        {highlights.map((highlight) => (
          <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
        ))}
      </Scrollable>
    </Tabs.Content>
  );
}

function HighlightCard(props) {
  const { documentsRef } = useFirestore();

  if (!props.tag || !props.highlight) {
    return <></>;
  }

  return (
    <div className="roundedBorders m-3 p-3" style={{ position: "relative" }}>
      <p style={{ paddingRight: "2rem" }}>{props.highlight.text}</p>
      <Button
        variant="link"
        style={{ position: "absolute", right: 0, top: 0 }}
        onClick={() => {
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
    </div>
  );
}
