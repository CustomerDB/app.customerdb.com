import React, { useContext, useEffect, useRef, useState } from "react";
import colorPair, { getTextColorForBackground } from "../util/color.js";
import { useNavigate, useParams } from "react-router-dom";

import AddIcon from "@material-ui/icons/Add";
import Archive from "@material-ui/icons/Archive";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import ContentEditable from "react-contenteditable";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Fab from "@material-ui/core/Fab";
import Grid from "@material-ui/core/Grid";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Scrollable from "../shell/Scrollable.js";
import StarIcon from "@material-ui/icons/Star";
import { SwatchesPicker } from "react-color";
import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { makeStyles } from "@material-ui/core/styles";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";

const useStyles = makeStyles({
  tagGroupCard: {
    margin: "1rem 1rem 1rem 2rem",
    padding: "1rem 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
});

export default function Tags(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { tagGroupsRef } = useFirestore();
  const navigate = useNavigate();
  const { orgID, tagGroupID } = useParams();
  const [tagGroups, setTagGroups] = useState([]);

  const { defaultTagGroupID } = useOrganization();

  useEffect(() => {
    if (!tagGroupsRef) {
      return;
    }

    return tagGroupsRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        let newTagGroups = [];

        snapshot.forEach((doc) => {
          let data = doc.data();

          data["ID"] = doc.id;
          newTagGroups.push(data);
        });

        setTagGroups(newTagGroups);
      });
  }, [tagGroupsRef]);

  const onAdd = () => {
    event("create_tag_group", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    tagGroupsRef.add({
      name: "New tag set",
      createdBy: oauthClaims.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),

      // Deletion is modeled as "soft-delete"; when the deletionTimestamp is set,
      // we don't show the document anymore in the list. However, it should be
      // possible to recover the document by unsetting this field before
      // the deletion grace period expires and the GC sweep does a permanent delete.
      deletionTimestamp: "",
    });
  };

  if (!tagGroupsRef || !defaultTagGroupID) {
    return <Loading />;
  }

  let listItems =
    tagGroups &&
    tagGroups.map((tg) => (
      <ListItem
        button
        key={tg.ID}
        selected={tg.ID === tagGroupID}
        onClick={() => {
          navigate(`/orgs/${orgID}/settings/tags/${tg.ID}`);
        }}
      >
        <ListItemAvatar>
          {tg.ID === defaultTagGroupID && <StarIcon />}
        </ListItemAvatar>
        <ListItemText
          primary={tg.name}
          secondary={
            tg.creationTimestamp && (
              <Moment fromNow date={tg.creationTimestamp.toDate()} />
            )
          }
        />
      </ListItem>
    ));

  let list = (
    <ListContainer>
      <Scrollable>
        <List>{listItems}</List>
      </Scrollable>
      <Fab
        style={{ position: "absolute", bottom: "15px", right: "15px" }}
        color="secondary"
        aria-label="add"
        onClick={onAdd}
      >
        <AddIcon />
      </Fab>
    </ListContainer>
  );

  if (tagGroupID) {
    list = <Hidden smDown>{list}</Hidden>;
  }

  let content = undefined;

  if (tagGroupID) {
    content = (
      <TagGroup key={tagGroupID} defaultTagGroupID={defaultTagGroupID} />
    );
  }

  return (
    <Grid container item xs={12} style={{ height: "100%" }}>
      {list}
      {content}
    </Grid>
  );
}

function TagGroup(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID, tagGroupID } = useParams();
  const { tagGroupsRef, orgRef } = useFirestore();
  const [tagGroupRef, setTagGroupRef] = useState();
  const [tagGroup, setTagGroup] = useState();
  const [tags, setTags] = useState([]);
  const [tagNames, setTagNames] = useState({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const classes = useStyles();

  useEffect(() => {
    if (!tagGroupsRef || !tagGroupID) {
      return;
    }
    setTagGroupRef(tagGroupsRef.doc(tagGroupID));
  }, [tagGroupsRef, tagGroupID]);

  useEffect(() => {
    if (!tagGroupRef) return;

    return tagGroupRef.onSnapshot((doc) => {
      let data = doc.data();
      data["ID"] = doc.id;
      setTagGroup(data);
    });
  }, [tagGroupRef]);

  useEffect(() => {
    if (!tagGroupRef) return;

    let unsubscribe = tagGroupRef
      .collection("tags")
      .orderBy("creationTimestamp", "asc")
      .where("deletionTimestamp", "==", "")
      .onSnapshot((snapshot) => {
        let newTags = [];
        let newTagNames = {};

        snapshot.forEach((doc) => {
          let data = doc.data();
          data["ID"] = doc.id;
          newTags.push(data);

          newTagNames[data.ID] = data.name;
        });

        setTags(newTags);
        setTagNames(newTagNames);
      });
    return unsubscribe;
  }, [tagGroupRef]);

  const onAddTag = () => {
    if (!tagGroupRef) return;

    event("create_tag", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    let color = colorPair();
    let newTagID = nanoid();

    tagGroupRef.collection("tags").doc(newTagID).set({
      ID: newTagID,
      name: "Untitled tag",
      organizationID: orgID,
      color: color.background,
      textColor: color.foreground,
      createdBy: oauthClaims.email,
      creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      deletionTimestamp: "",
    });
  };

  const checkReturn = (e) => {
    if (e.key === "Enter") {
      e.target.blur();
    }
  };

  if (!tagGroupRef || !tagGroup) {
    return <Loading />;
  }

  let archiveDialog = (
    <TagGroupDeleteDialog
      tagGroupRef={tagGroupRef}
      open={openDeleteDialog}
      setOpen={setOpenDeleteDialog}
      tagGroup={tagGroup}
    />
  );

  let tagDetails = tags.map((tag) => (
    <Grid
      container
      item
      xs={12}
      key={tag.ID}
      alignItems="flex-start"
      style={{ marginBottom: "1rem" }}
    >
      <Grid container item xs>
        <ColorPicker tag={tag} tagGroupRef={tagGroupRef} />
        <TextField
          style={{ marginLeft: "0.5rem" }}
          placeholder="Name"
          value={tagNames[tag.ID]}
          variant="outlined"
          onChange={(e) => {
            let tn = {};
            Object.assign(tn, tagNames);
            tn[tag.ID] = e.target.value;
            setTagNames(tn);
          }}
          onBlur={(e) => {
            if (tagNames[tag.ID] === undefined) {
              return;
            }

            tagGroupRef.collection("tags").doc(tag.ID).set(
              {
                name: tagNames[tag.ID],
              },
              { merge: true }
            );
          }}
          onKeyDown={checkReturn}
        />
        <Button
          color="primary"
          style={{ marginLeft: "0.5rem" }}
          onClick={() => {
            event("delete_tag", {
              orgID: orgID,
              userID: oauthClaims.user_id,
            });

            console.debug("TODO: use a modal for this instead");
            let proceed = window.confirm(
              `This will remove highlights associated with this tag.\nAre you sure you want to delete it?`
            );

            if (!proceed) {
              console.debug("user declined to proceeed with deleting the tag");
              return;
            }

            tagGroupRef.collection("tags").doc(tag.ID).set(
              {
                deletedBy: oauthClaims.email,
                deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          }}
        >
          <Archive />
        </Button>
      </Grid>
    </Grid>
  ));

  return (
    <>
      <Grid
        style={{ position: "relative", height: "100%" }}
        container
        item
        sm={12}
        md={9}
        xl={10}
      >
        <Scrollable>
          <Grid container item spacing={0} xs={12}>
            <Grid container item justify="center">
              <Card className={classes.tagGroupCard}>
                <CardContent>
                  <Grid container>
                    <Grid container item xs={12} alignItems="flex-start">
                      <Grid item xs={10}>
                        <Typography gutterBottom variant="h4" component="h2">
                          <ContentEditable
                            html={tagGroup.name}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.target.blur();
                              }
                            }}
                            onBlur={(e) => {
                              if (tagGroupRef) {
                                let newName = e.target.innerText
                                  .replace(/(\r\n|\n|\r)/gm, " ")
                                  .replace(/\s+/g, " ")
                                  .trim();

                                console.debug(
                                  "setting tag group name",
                                  newName
                                );

                                tagGroupRef.set(
                                  { name: newName },
                                  { merge: true }
                                );
                              }
                            }}
                          />
                        </Typography>
                        <Typography
                          variant="body2"
                          color="textSecondary"
                          component="p"
                          className={classes.detailsParagraph}
                        >
                          Created{" "}
                          <Moment
                            fromNow
                            date={tagGroup.creationTimestamp.toDate()}
                          />{" "}
                          by {tagGroup.createdBy}
                        </Typography>
                      </Grid>

                      <Grid item xs={2}>
                        <Button
                          variant="contained"
                          onClick={() => {
                            orgRef.set(
                              { defaultTagGroupID: tagGroup.ID },
                              { merge: true }
                            );
                          }}
                        >
                          Make default
                        </Button>

                        <IconButton
                          color="primary"
                          aria-label="Archive template"
                          onClick={() => {
                            console.debug("confirm archive template");
                            setOpenDeleteDialog(true);
                          }}
                        >
                          <Archive />
                        </IconButton>
                      </Grid>
                    </Grid>

                    <Grid item xs={12}>
                      {tagDetails}
                    </Grid>
                  </Grid>
                </CardContent>
                <CardActions>
                  <Button onClick={onAddTag}>Add Tag</Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>
      {archiveDialog}
    </>
  );
}

function ColorPicker(props) {
  const ref = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState();

  useEffect(() => {
    const handleClose = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
    };
  }, [ref]);

  return (
    <div ref={ref}>
      <div
        style={{
          background: props.tag.color,
          width: "25px",
          height: "100%",
          borderRadius: "0.25rem",
        }}
        onClick={(e) => {
          setColorPickerOpen(true);
        }}
      >
        {}
      </div>
      {colorPickerOpen ? (
        <div style={{ position: "absolute", zIndex: 2 }}>
          <SwatchesPicker
            color={props.tag.color}
            onChangeComplete={(color) => {
              props.tagGroupRef
                .collection("tags")
                .doc(props.tag.ID)
                .set(
                  {
                    color: color.hex,
                    textColor: getTextColorForBackground(color.hex),
                  },
                  { merge: true }
                );

              setColorPickerOpen(false);
            }}
          />
        </div>
      ) : (
        <></>
      )}
    </div>
  );
}

function TagGroupDeleteDialog({ tagGroupRef, open, setOpen, tagGroup }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { orgID } = useParams();
  const navigate = useNavigate();

  const cancel = () => {
    console.debug("user canceled tag group archive");
    setOpen(false);
  };

  const archive = () => {
    if (
      !tagGroupRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !tagGroup ||
      !tagGroup.ID
    ) {
      setOpen(false);
      return;
    }

    console.debug("archiving tag group");

    event("delete_tag_group", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });
    tagGroupRef.set(
      {
        deletedBy: oauthClaims.email,
        deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    navigate(`/orgs/${orgID}/settings/tags`);
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this tag group?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this tag group for deletion. This tag group will no longer be
          visible and will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button onClick={archive} color="primary" autoFocus>
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
