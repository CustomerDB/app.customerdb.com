import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import TurnedInIcon from "@material-ui/icons/TurnedIn";
import TurnedInNotIcon from "@material-ui/icons/TurnedInNot";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  helpText: {
    margin: "1rem",
    padding: "1rem",
  },
  quoteCard: {
    width: "100%",
    margin: "1rem",
    padding: "0.5rem",
    position: "relative",
  },
  highlightsContainer: {
    margin: "1rem",
  },
});

export default function PersonHighlightsPane(props) {
  let { orgID } = useParams();

  const classes = useStyles();

  const [tags, setTags] = useState();

  const [combinedHighlights, setCombinedHighlights] = useState();
  const [combinedPinnedHighlights, setCombinedPinnedHighlights] = useState();

  const [pinnedHighlights, setPinnedHighlights] = useState();
  const [highlights, setHighlights] = useState();

  const [
    pinnedTranscriptHighlights,
    setPinnedTranscriptHighlights,
  ] = useState();
  const [transcriptHighlights, setTranscriptHighlights] = useState();

  const {
    allHighlightsRef,
    allTranscriptHighlightsRef,
    allTagsRef,
  } = useFirestore();

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
    if (!props.person || !allHighlightsRef || !allTranscriptHighlightsRef) {
      return;
    }

    console.log("props.person", props.person);

    let unsubscribeHighlights = allHighlightsRef
      .where("personID", "==", props.person.ID)
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newHighlights = [];
        let newPinnedHighlights = [];
        snapshot.forEach((doc) => {
          let highlight = doc.data();
          highlight.ref = doc.ref;
          highlight.source = "notes";
          console.debug("highlight", highlight);
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

    let unsubscribeTranscriptHighlights = allTranscriptHighlightsRef
      .where("personID", "==", props.person.ID)
      .where("organizationID", "==", orgID)
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.debug("transcript highlights snapshot", snapshot.docs);
        let newHighlights = [];
        let newPinnedHighlights = [];
        snapshot.forEach((doc) => {
          let highlight = doc.data();
          highlight.ref = doc.ref;
          highlight.source = "transcript";
          console.debug("highlight", highlight);
          highlight.ID = doc.id;

          if (highlight.pinned) {
            newPinnedHighlights.push(highlight);
            return;
          }
          newHighlights.push(highlight);
        });
        setTranscriptHighlights(newHighlights);
        setPinnedTranscriptHighlights(newPinnedHighlights);
      });

    return () => {
      unsubscribeHighlights();
      unsubscribeTranscriptHighlights();
    };
  }, [orgID, props.person, allHighlightsRef, allTranscriptHighlightsRef]);

  // Subscribe to unpinned note and transcript highlights,
  // combine into one sorted list.
  useEffect(() => {
    if (!highlights || !transcriptHighlights) return;

    let combined = highlights.concat(transcriptHighlights);
    combined.sort((a, b) => {
      return (
        a.creationTimestamp.toDate().valueOf() >
        b.creationTimestamp.toDate().valueOf()
      );
    });
    setCombinedHighlights(combined);
  }, [highlights, transcriptHighlights]);

  // Subscribe to pinned note and transcript highlights,
  // combine into one sorted list.
  useEffect(() => {
    if (!pinnedHighlights || !pinnedTranscriptHighlights) return;

    let combined = pinnedHighlights.concat(pinnedTranscriptHighlights);
    combined.sort((a, b) => {
      return (
        a.creationTimestamp.toDate().valueOf() >
        b.creationTimestamp.toDate().valueOf()
      );
    });
    setCombinedPinnedHighlights(combined);
  }, [pinnedHighlights, pinnedTranscriptHighlights]);

  if (!combinedHighlights || !tags || !combinedPinnedHighlights) {
    return <Loading />;
  }

  console.log("Rendering clips");

  if (combinedHighlights.length + combinedPinnedHighlights.length === 0) {
    return (
      <div className={classes.helpText}>
        Clips in linked customer interviews will appear here. Pin the most
        important clips to build rich customer profiles.
      </div>
    );
  }

  return (
    <Grid container className={classes.highlightsContainer}>
      {combinedPinnedHighlights.length > 0 && (
        <Typography gutterBottom variant="body2" component="p">
          PINNED
        </Typography>
      )}
      {combinedPinnedHighlights.map((highlight) => (
        <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
      ))}
      {combinedPinnedHighlights.length > 0 && (
        <Typography gutterBottom variant="body2" component="p">
          OTHERS
        </Typography>
      )}

      {combinedHighlights.map((highlight) => (
        <HighlightCard tag={tags[highlight.tagID]} highlight={highlight} />
      ))}
    </Grid>
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
    <Grid container item xs={12}>
      <Card
        className={classes.quoteCard}
        onClick={() => {
          navigate(
            `/orgs/${orgID}/interviews/${props.highlight.documentID}/${props.highlight.source}?quote=${props.highlight.ID}`
          );
        }}
      >
        <CardActionArea>
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

              props.highlight.ref.update({
                pinned: !props.highlight.pinned,
              });
            }}
          >
            {props.highlight.pinned ? <TurnedInIcon /> : <TurnedInNotIcon />}
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
        </CardActionArea>
      </Card>
    </Grid>
  );
}
