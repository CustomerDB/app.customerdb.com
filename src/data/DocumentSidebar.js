import React, { useContext, useState, useEffect } from "react";

import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import useFirestore from "../db/Firestore.js";
import Tags, { addTagStyles, removeTagStyles } from "./Tags.js";

import TagGroupSelector from "./TagGroupSelector.js";

import SearchDropdown from "../search/Dropdown.js";

import Moment from "react-moment";
import Avatar from "react-avatar";

import { useParams, useNavigate, Link } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles({
  documentSidebarCard: {
    margin: "2rem 1rem 0rem 1rem",
    padding: "1rem 1rem 0rem 1rem",
  },
});

export default function DocumentSidebar(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const { documentRef, tagGroupsRef, peopleRef } = useFirestore();

  const navigate = useNavigate();

  const [person, setPerson] = useState();
  const [tagGroupName, setTagGroupName] = useState("Tags");
  const [tags, setTags] = useState();
  const [editPerson, setEditPerson] = useState(false);
  const [editTagGroup, setEditTagGroup] = useState(false);

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

  // Subscribe to document's tag group name.
  useEffect(() => {
    if (!props.document.tagGroupID || !tagGroupsRef) {
      return;
    }

    return tagGroupsRef.doc(props.document.tagGroupID).onSnapshot((doc) => {
      let tagGroupData = doc.data();
      setTagGroupName(tagGroupData.name);
    });
  }, [props.document.tagGroupID, tagGroupsRef]);

  // Subscribe to tags for the document's tag group.
  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }
    if (!props.document.tagGroupID) {
      setTags();
      removeTagStyles();
      return;
    }

    let unsubscribe = tagGroupsRef
      .doc(props.document.tagGroupID)
      .collection("tags")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = {};
        snapshot.forEach((doc) => {
          let data = doc.data();
          data.ID = doc.id;
          newTags[data.ID] = data;
        });
        setTags(newTags);
        addTagStyles(newTags);
      });
    return () => {
      removeTagStyles();
      unsubscribe();
    };
  }, [props.document.tagGroupID, tagGroupsRef]);

  return (
    <Grid
      container
      md={4}
      xl={3}
      direction="column"
      justify="flex-start"
      alignItems="stretch"
      spacing={0}
    >
      <Grid item>
        <Card elevation={2} className={classes.documentSidebarCard}>
          <CardContent>
            <Typography gutterBottom variant="h6" component="h2">
              Created by
            </Typography>
            <Typography variant="body2" color="textSecondary" component="p">
              {props.document.createdBy}
              <br />
              <em>
                <Moment
                  fromNow
                  date={props.document.creationTimestamp.toDate()}
                />
              </em>
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item>
        <Card elevation={2} className={classes.documentSidebarCard}>
          <CardActionArea
            onClick={() => {
              person && navigate(`/orgs/${orgID}/people/${person.ID}`);
            }}
          >
            <CardContent>
              <Typography gutterBottom variant="h6" component="h2">
                Linked person
              </Typography>
              {person && !editPerson ? (
                <Grid container spacing={0}>
                  <Grid
                    container
                    xs={12}
                    direction="row"
                    style={{ marginTop: "1rem" }}
                  >
                    <Grid item md={3}>
                      <Avatar size={70} name={person.name} round={true} />
                    </Grid>
                    <Grid item md={9}>
                      <Typography gutterBottom variant="h5" component="h2">
                        <Link to={`/orgs/${orgID}/people/${person.ID}`}>
                          {person.name}
                        </Link>
                      </Typography>
                    </Grid>
                  </Grid>
                  <Grid item xs={12} style={{ marginTop: "1rem" }}>
                    <Typography
                      variant="body"
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
                  <div className="d-flex">
                    <SearchDropdown
                      index={process.env.REACT_APP_ALGOLIA_PEOPLE_INDEX}
                      default={person ? person.name : ""}
                      onChange={(ID, name) => {
                        event("link_data_to_person", {
                          orgID: oauthClaims.orgID,
                          userID: oauthClaims.user_id,
                        });

                        documentRef
                          .set(
                            {
                              personID: ID,
                            },
                            { merge: true }
                          )
                          .then(() => {
                            setEditPerson(false);
                          });
                      }}
                    />
                  </div>
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
      </Grid>

      <Grid item>
        <Card elevation={2} className={classes.documentSidebarCard}>
          <CardContent>
            {tags && !editTagGroup ? (
              <>
                <Typography gutterBottom variant="h6" component="h2">
                  {tagGroupName}
                </Typography>

                <Tags
                  tags={tags}
                  tagIDsInSelection={props.tagIDsInSelection}
                  onChange={props.onTagControlChange}
                />
              </>
            ) : (
              <>
                <p>
                  <b>Tag Group</b>
                </p>
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
    </Grid>
  );
}
