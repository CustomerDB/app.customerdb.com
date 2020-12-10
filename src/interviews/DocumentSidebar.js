import { Link, useParams } from "react-router-dom";
import React, { useContext, useEffect, useState } from "react";

import Avatar from "react-avatar";
import Card from "@material-ui/core/Card";
import Moment from "react-moment";
import Table from "@material-ui/core/Table";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import SearchDropdown from "./PeopleDropdown.js";
import TagGroupSelector from "./TagGroupSelector.js";
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
  const {
    documentRef,
    peopleRef,
    transcriptionsRef,
    membersRef,
  } = useFirestore();

  const [person, setPerson] = useState();

  const [createdBy, setCreatedBy] = useState();

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
          .child(transcriptionData.cbrPath || transcriptionData.inputPath)
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

  useEffect(() => {
    if (!props.document.createdBy || !membersRef) {
      return;
    }

    return membersRef.doc(props.document.createdBy).onSnapshot((doc) => {
      let member = doc.data();
      setCreatedBy(member);
    });
  }, [props.document.createdBy, membersRef]);

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
        <Card className={classes.videoCard}>
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

      <Table>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row">
              <b>Customer</b>
            </TableCell>
            <TableCell>
              {person && (
                <Link to={`/orgs/${orgID}/people/${person.ID}`}>
                  <Avatar
                    size={30}
                    name={person.name}
                    round={true}
                    src={person.imageURL}
                  />
                </Link>
              )}
            </TableCell>
            <TableCell>
              <SearchDropdown
                index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
                defaultPerson={person ? person.name : ""}
                onChange={(ID, name) => {
                  event(firebase, "link_interview_to_person", {
                    orgID: orgID,
                    userID: oauthClaims.user_id,
                  });

                  // If ID is undefined, we have to create a new person with that name.
                  let personCreatePromise = Promise.resolve(ID);
                  if (!ID && name) {
                    personCreatePromise = peopleRef
                      .add({
                        name: name,
                        createdBy: oauthClaims.email,
                        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        deletionTimestamp: "",
                      })
                      .then((doc) => {
                        return doc.id;
                      });
                  }

                  personCreatePromise.then((personID) =>
                    documentRef
                      .update({
                        personID: personID || "",
                      })
                      .then(() => {
                        // If neither ID or name is present, clear person
                        if (!ID && !name) {
                          setPerson();
                        }
                      })
                  );
                }}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              <b>Author</b>
            </TableCell>
            <TableCell>
              {createdBy && (
                <Avatar
                  size={30}
                  name={createdBy.displayName}
                  round={true}
                  src={createdBy.photoURL}
                />
              )}
            </TableCell>
            <TableCell>{createdBy && createdBy.displayName}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              <b>Created</b>
            </TableCell>
            <TableCell></TableCell>
            <TableCell>
              <Moment
                fromNow
                date={props.document.creationTimestamp.toDate()}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row">
              <b>Tags</b>
            </TableCell>
            <TableCell></TableCell>
            <TableCell>
              <TagGroupSelector onChange={() => {}} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Grid>
  );
}
