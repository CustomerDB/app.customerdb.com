import "react-quill/dist/quill.snow.css";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Archive from "@material-ui/icons/Archive";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import TableBody from "@material-ui/core/TableBody";
import ContentEditable from "react-contenteditable";
import Delta from "quill-delta";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FirebaseContext from "../util/FirebaseContext.js";
import Grid from "@material-ui/core/Grid";
import GuideHelp from "./GuideHelp.js";
import Hidden from "@material-ui/core/Hidden";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListContainer from "../shell/ListContainer";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import ReactQuill from "react-quill";
import Scrollable from "../shell/Scrollable.js";
import Shell from "../shell/Shell.js";
import TagGroupSelector from "./TagGroupSelector.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { initialDelta } from "../editor/delta.js";
import { makeStyles } from "@material-ui/core/styles";
import useFirestore from "../db/Firestore.js";
import { v4 as uuidv4 } from "uuid";
import CloseIcon from "@material-ui/icons/Close";

// Synchronize every second (1000ms).
const syncPeriod = 1000;

const useStyles = makeStyles({
  documentPaper: {
    margin: "0 1rem 0 2rem",
    padding: "1rem 2rem 4rem 2rem",
    minHeight: "48rem",
    width: "100%",
    maxWidth: "80rem",
    borderRight: "1px solid rgba(0, 0, 0, 0.12)",
  },
  detailsParagraph: {
    marginBottom: "0.35rem",
  },
  documentSidebarCard: {
    margin: "0rem 2rem 1rem 1rem",
    padding: "1rem 1rem 0rem 1rem",
  },
});

export default function Guides({ create }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const [templates, setTemplates] = useState();
  const { orgID, guideID } = useParams();
  const { templatesRef } = useFirestore();

  const navigate = useNavigate();

  useEffect(() => {
    if (!templatesRef) {
      return;
    }

    return templatesRef
      .where("deletionTimestamp", "==", "")
      .orderBy("creationTimestamp", "desc")
      .onSnapshot((snapshot) => {
        console.debug("received templates snapshot");

        let newTemplates = [];
        snapshot.forEach((doc) => {
          newTemplates.push(doc.data());
        });
        setTemplates(newTemplates);
      });
  }, [templatesRef]);

  useEffect(() => {
    if (
      !create ||
      !templatesRef ||
      !oauthClaims.user_id ||
      !oauthClaims.email
    ) {
      return;
    }

    event(firebase, "create_guide", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    let newGuideID = uuidv4();
    templatesRef
      .doc(newGuideID)
      .set({
        ID: newGuideID,
        name: "Untitled Guide",
        createdBy: oauthClaims.email,
        creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then(() => {
        return templatesRef
          .doc(newGuideID)
          .collection("snapshots")
          .doc()
          .set({
            delta: { ops: initialDelta().ops },
            createdBy: oauthClaims.email,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
      })
      .then(() => {
        navigate(`/orgs/${orgID}/guides/${newGuideID}`);
      });
  }, [create, templatesRef, firebase, navigate, oauthClaims, orgID]);

  if (!templates) {
    return <Loading />;
  }

  let listItems =
    templates &&
    templates.map((t) => (
      <ListItem
        button
        key={t.ID}
        selected={t.ID === guideID}
        onClick={() => {
          navigate(`/orgs/${orgID}/guides/${t.ID}`);
        }}
      >
        <ListItemText
          primary={t.name}
          secondary={
            t.creationTimestamp && (
              <Moment fromNow date={t.creationTimestamp.toDate()} />
            )
          }
        />
      </ListItem>
    ));

  let list =
    listItems.length > 0 ? (
      <ListContainer>
        <Scrollable>
          <List>{listItems}</List>
        </Scrollable>
      </ListContainer>
    ) : (
      <GuideHelp />
    );

  if (guideID) {
    list = <Hidden mdDown>{list}</Hidden>;
  }

  let content;
  if (templatesRef && guideID) {
    content = <Guide templateRef={templatesRef.doc(guideID)} key={guideID} />;
  }

  return (
    <Shell>
      <Grid container className="fullHeight" style={{ position: "relative" }}>
        {list}
        {content}
      </Grid>
    </Shell>
  );
}

function Guide({ templateRef }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID, guideID } = useParams();
  const { templatesRef } = useFirestore();

  const [template, setTemplate] = useState();
  const [templateRevision, setTemplateRevision] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const dirty = useRef(false);

  const reactQuillRef = useRef(null);

  const classes = useStyles();

  const navigate = useNavigate();

  // Subscribe to template document
  useEffect(() => {
    if (!templatesRef) return;

    return templatesRef.doc(guideID).onSnapshot((doc) => {
      console.debug("received template snapshot");
      setTemplate(doc.data());
    });
  }, [templatesRef, guideID]);

  // Subscribe to latest template snapshot
  useEffect(() => {
    if (!templatesRef || !guideID) return;

    return templatesRef
      .doc(guideID)
      .collection("snapshots") // TODO: Migrate this collection to "revisions"
      .orderBy("timestamp", "desc")
      .limit(1)
      .onSnapshot((snapshot) => {
        // hint: limit 1 -- iterating over a list of at most 1
        snapshot.forEach((snapshotDoc) => {
          let data = snapshotDoc.data();
          let delta = new Delta(data.delta.ops);
          setTemplateRevision(delta);
        });
      });
  }, [templatesRef, guideID]);

  // Periodically save local template changes
  useEffect(() => {
    if (!templatesRef || !guideID) {
      return;
    }

    const onSync = () => {
      if (!dirty.current || !reactQuillRef.current) {
        return;
      }

      event(firebase, "edit_guide", {
        orgID: orgID,
        userID: oauthClaims.user_id,
      });

      let editor = reactQuillRef.current.getEditor();
      let currentDelta = editor.getContents();

      console.log("uploading new snapshot delta", currentDelta);

      return templatesRef
        .doc(guideID)
        .collection("snapshots")
        .doc()
        .set({
          delta: { ops: currentDelta.ops },
          createdBy: oauthClaims.email,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        })
        .then(() => {
          dirty.current = false;
        });
    };

    console.debug(`starting periodic onSync every ${syncPeriod}ms`);
    let syncInterval = setInterval(onSync, syncPeriod);

    return () => {
      clearInterval(syncInterval);
    };
  }, [
    templatesRef,
    reactQuillRef,
    guideID,
    oauthClaims.email,
    orgID,
    oauthClaims.user_id,
    firebase,
  ]);

  const onEdit = (content, delta, source, editor) => {
    if (source === "user") {
      console.debug("onEdit: setting dirty bit");
      dirty.current = true;
    }
  };

  let archiveDialog = (
    <GuideDeleteDialog
      templateRef={templatesRef && templatesRef.doc(guideID)}
      open={openDeleteDialog}
      setOpen={setOpenDeleteDialog}
      template={template}
    />
  );

  if (!template || !templateRevision) {
    return <Loading />;
  }

  return (
    <Grid
      container
      item
      xs={12}
      spacing={0}
      style={{ backgroundColor: "white", position: "absolute", height: "100%" }}
    >
      <Grid
        style={{ position: "relative", height: "100%" }}
        container
        item
        sm={12}
        md={8}
        xl={9}
      >
        <Scrollable>
          <Grid container item spacing={0} xs={12} style={{ height: "100%" }}>
            <Grid container item justify="center">
              <Paper className={classes.documentPaper}>
                <Grid container>
                  <Grid container item xs={12} alignItems="flex-start">
                    <Grid item xs={10}>
                      <Typography gutterBottom variant="h4" component="h2">
                        <ContentEditable
                          html={template.name}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.target.blur();
                            }
                          }}
                          onBlur={(e) => {
                            if (templateRef) {
                              let newName = e.target.innerText
                                .replace(/(\r\n|\n|\r)/gm, " ")
                                .replace(/\s+/g, " ")
                                .trim();

                              console.debug("setting template name", newName);

                              templateRef.update({ name: newName });
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
                          date={template.creationTimestamp.toDate()}
                        />{" "}
                        by {template.createdBy}
                      </Typography>
                    </Grid>

                    <Grid item xs={2}>
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
                      <IconButton
                        onClick={() => {
                          // TODO: Communicate with parent component instead of using navigate.
                          navigate(`/orgs/${orgID}/guides`);
                        }}
                        color="inherit"
                      >
                        <CloseIcon />
                      </IconButton>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <ReactQuill
                      ref={reactQuillRef}
                      defaultValue={templateRevision}
                      theme="snow"
                      className="guideQuill"
                      placeholder="Start typing here"
                      onChange={onEdit}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, false] }],
                          [
                            "bold",
                            "italic",
                            "underline",
                            "strike",
                            "blockquote",
                          ],
                          [
                            { list: "ordered" },
                            { list: "bullet" },
                            { indent: "-1" },
                            { indent: "+1" },
                          ],
                          ["link", "image"],
                          ["clean"],
                        ],
                        history: {
                          userOnly: true,
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>

      <Hidden smDown>
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
          <Table>
            <TableBody>
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
      </Hidden>

      {archiveDialog}
    </Grid>
  );
}

function GuideDeleteDialog({ templateRef, open, setOpen, template }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const navigate = useNavigate();

  const cancel = () => {
    console.debug("user canceled template archive");
    setOpen(false);
  };

  const archive = () => {
    if (
      !templateRef ||
      !oauthClaims ||
      !oauthClaims.email ||
      !template ||
      !template.ID
    ) {
      setOpen(false);
      return;
    }

    console.debug("archiving template");

    event(firebase, "delete_guide", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });
    templateRef.update({
      deletedBy: oauthClaims.email,
      deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    navigate(`/orgs/${orgID}/guides`);
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this guide?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this guide for deletion. This guide will no longer be visible and
          will be permanently deleted after thirty days.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} color="primary">
          Cancel
        </Button>
        <Button
          onClick={archive}
          variant="contained"
          color="secondary"
          autoFocus
        >
          Archive
        </Button>
      </DialogActions>
    </Dialog>
  );
}
