import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import Tabs from "../shell/Tabs.js";
import Scrollable from "../shell/Scrollable.js";

import { useParams } from "react-router-dom";

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
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
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

    return (
      allHighlightsRef
        .where("personID", "==", props.person.ID)
        .where("organizationID", "==", orgID)
        .where("deletionTimestamp", "==", "")
        // .orderBy('creationTimestamp', 'desc')
        .onSnapshot((snapshot) => {
          let newHighlights = [];
          snapshot.forEach((doc) => {
            let highlight = doc.data();
            highlight.ID = doc.id;
            newHighlights.push(highlight);
          });
          setHighlights(newHighlights);
        })
    );
  }, [props.person, allHighlightsRef]);

  return (
    <Tabs.Content>
      <Scrollable>
        {highlights ? (
          highlights.map((highlight) => <p>{highlight.text}</p>)
        ) : (
          <></>
        )}
      </Scrollable>
    </Tabs.Content>
  );
}
