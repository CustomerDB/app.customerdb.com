import { Link, useNavigate, useParams } from "react-router-dom";
import React, { useContext, useEffect, useState } from "react";

import Avatar from "react-avatar";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import SearchDropdown from "../search/Dropdown.js";
import TagGroupSelector from "./TagGroupSelector.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import VideoPlayer from "./VideoPlayer.js";
import event from "../analytics/event.js";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";

const useStyles = makeStyles({
  documentSidebarCard: {
    margin: "0rem 2rem 1rem 1rem",
    padding: "1rem 1rem 0rem 1rem",
  },
  videoCard: {
    margin: "0rem 2rem 1rem 1rem",
  },
});

export default function DocumentSidebar(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { documentRef, peopleRef, transcriptionsRef } = useFirestore();

  const navigate = useNavigate();

  const [person, setPerson] = useState();
  const [editPerson, setEditPerson] = useState(false);
  const [editTagGroup, setEditTagGroup] = useState(false);

  const [transcriptionVideo, setTranscriptionVideo] = useState();

  const classes = useStyles();

  // Subscribe to person linked to this document.
  useEffect(() => {
    if (!peopleRef || !props.document || !props.document.personID) {
      return;
    }

    return peopleRef.doc(props.document.personID).onSnapshot((doc) => {
      let person = doc.data();
      if (person.deletionTimestamp !== "") {
        return;
      }
      person.ID = doc.id;
      setPerson(person);
    });
  }, [props.document, peopleRef]);

  useEffect(() => {
    if (!props.document.transcription || !transcriptionsRef) {
      return;
    }

    return transcriptionsRef
      .doc(props.document.transcription)
      .onSnapshot((doc) => {
        if (!doc.exists) {
          setTranscriptionVideo();
          return;
        }

        let transcriptionData = doc.data();

        let storageRef = firebase.storage().ref();
        storageRef
          .child(transcriptionData.inputPath)
          .getDownloadURL()
          .then((url) => {
            setTranscriptionVideo(url);
          });
      });
  }, [
    props.document.transcription,
    transcriptionsRef,
    props.document,
    firebase,
  ]);

  return (
    <Grid
      container
      item
      md={4}
      xl={3}
      direction="column"
      justify="flex-start"
      alignItems="stretch"
      spacing={0}
      style={{
        overflowX: "hidden",
        paddingTop: "1rem",
      }}
    >
      {transcriptionVideo ? (
        <Card elevation={2} className={classes.videoCard}>
          <VideoPlayer
            doc={props.document}
            transcriptionVideo={transcriptionVideo}
            reactQuillRef={props.reactQuillRef}
            selectionChannelPort={props.selectionChannelPort}
          />
        </Card>
      ) : (
        <></>
      )}

      <Card elevation={2} className={classes.documentSidebarCard}>
        <CardActionArea
          onClick={() => {
            person &&
              !editPerson &&
              navigate(`/orgs/${orgID}/people/${person.ID}`);
          }}
        >
          <CardContent>
            {person && !editPerson ? (
              <Grid container spacing={0}>
                <Grid
                  container
                  item
                  xs={12}
                  direction="row"
                  style={{ marginTop: "1rem" }}
                >
                  <Grid
                    item
                    xl={3}
                    md={12}
                    style={{ marginBottom: "1rem", paddingRight: "1rem" }}
                  >
                    <Avatar
                      size={70}
                      name={person.name}
                      round={true}
                      src={person.imageURL}
                    />
                  </Grid>
                  <Grid item xl={9} md={12} style={{ marginBottom: "1rem" }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      <Link to={`/orgs/${orgID}/people/${person.ID}`}>
                        {person.name}
                      </Link>
                    </Typography>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    component="p"
                  >
                    {person.job}
                    <br />
                    {person.company}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <>
                <Typography gutterBottom color="textSecondary">
                  Link customer
                </Typography>
                <SearchDropdown
                  index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
                  default={person ? person.name : ""}
                  onChange={(ID, name) => {
                    event(firebase, "link_interview_to_person", {
                      orgID: orgID,
                      userID: oauthClaims.user_id,
                    });

                    documentRef
                      .update({
                        personID: ID,
                      })
                      .then(() => {
                        setEditPerson(false);
                      });
                  }}
                />
              </>
            )}
          </CardContent>
        </CardActionArea>

        <CardActions>
          {person && !editPerson && (
            <Button
              size="small"
              color="primary"
              onClick={() => {
                setEditPerson(true);
              }}
            >
              Change
            </Button>
          )}

          {editPerson && (
            <Button
              size="small"
              color="primary"
              onClick={() => {
                setEditPerson(false);
              }}
            >
              Cancel
            </Button>
          )}
        </CardActions>
      </Card>

      <Card elevation={2} className={classes.documentSidebarCard}>
        <CardContent>
          {props.tagGroupName && !editTagGroup ? (
            <>
              <Typography gutterBottom color="textSecondary">
                Tags
              </Typography>
              <Typography gutterBottom variant="h5" component="h2">
                {props.tagGroupName}
              </Typography>
            </>
          ) : (
            <>
              <Typography gutterBottom color="textSecondary">
                Tags
              </Typography>
              <TagGroupSelector
                onChange={() => {
                  setEditTagGroup(false);
                }}
              />
            </>
          )}
        </CardContent>
        <CardActions>
          {!editTagGroup && (
            <Button
              size="small"
              color="primary"
              onClick={() => {
                setEditTagGroup(true);
              }}
            >
              Change
            </Button>
          )}

          {editTagGroup && (
            <Button
              size="small"
              color="primary"
              onClick={() => {
                setEditTagGroup(false);
              }}
            >
              Cancel
            </Button>
          )}
        </CardActions>
      </Card>
    </Grid>
  );
}
