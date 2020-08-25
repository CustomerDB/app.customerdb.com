import "react-quill/dist/quill.snow.css";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import AddIcon from "@material-ui/icons/Add";
import Archive from "@material-ui/icons/Archive";
import Button from "@material-ui/core/Button";
import ContentEditable from "react-contenteditable";
import Delta from "quill-delta";
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
import ListItemText from "@material-ui/core/ListItemText";
import { Loading } from "../util/Utils.js";
import Moment from "react-moment";
import Paper from "@material-ui/core/Paper";
import ReactQuill from "react-quill";
import Scrollable from "../shell/Scrollable.js";
import Typography from "@material-ui/core/Typography";
import UserAuthContext from "../auth/UserAuthContext.js";
import event from "../analytics/event.js";
import { initialDelta } from "../data/delta.js";
import { makeStyles } from "@material-ui/core/styles";
import { nanoid } from "nanoid";
import useFirestore from "../db/Firestore.js";

// Synchronize every second (1000ms).
const syncPeriod = 1000;

const useStyles = makeStyles({
  documentPaper: {
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

export default function Templates(props) {
  const { oauthClaims } = useContext(UserAuthContext);
  const [templates, setTemplates] = useState();
  const { orgID, templateID } = useParams();
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

  if (!templates) {
    return <Loading />;
  }

  const onAdd = () => {
    event("create_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });

    let newTemplateID = nanoid();
    templatesRef
      .doc(newTemplateID)
      .set({
        ID: newTemplateID,
        name: "Untitled Template",
        createdBy: oauthClaims.email,
        creationTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
        deletionTimestamp: "",
      })
      .then(() => {
        return templatesRef
          .doc(newTemplateID)
          .collection("snapshots")
          .doc()
          .set({
            delta: { ops: initialDelta().ops },
            createdBy: oauthClaims.email,
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          });
      })
      .then((newTemplateRef) => {
        navigate(`/orgs/${orgID}/settings/templates/${newTemplateID}`);
      });
  };

  let listItems =
    templates &&
    templates.map((t) => (
      <ListItem
        button
        key={t.ID}
        selected={t.ID === templateID}
        onClick={() => {
          navigate(`/orgs/${orgID}/settings/templates/${t.ID}`);
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

  if (templateID) {
    list = <Hidden smDown>{list}</Hidden>;
  }

  let content = templatesRef && templateID && <Template key={templateID} />;

  return (
    <Grid container item xs={12} style={{ height: "100%" }}>
      {list}
      {content}
    </Grid>
  );
}

function Template({ templateRef }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const { templateID } = useParams();
  const { templatesRef } = useFirestore();

  const [template, setTemplate] = useState();
  const [templateRevision, setTemplateRevision] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const dirty = useRef(false);

  const reactQuillRef = useRef(null);

  const classes = useStyles();

  // Subscribe to template document
  useEffect(() => {
    if (!templatesRef) return;

    return templatesRef.doc(templateID).onSnapshot((doc) => {
      console.debug("received template snapshot");
      setTemplate(doc.data());
    });
  }, [templatesRef, templateID]);

  // Subscribe to latest template snapshot
  useEffect(() => {
    if (!templatesRef || !templateID) return;

    return templatesRef
      .doc(templateID)
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
  }, [templatesRef, templateID]);

  // Periodically save local template changes
  useEffect(() => {
    if (!templatesRef || !templateID) {
      return;
    }

    const onSync = () => {
      if (!dirty.current || !reactQuillRef.current) {
        return;
      }

      event("edit_template", {
        orgID: oauthClaims.orgID,
        userID: oauthClaims.user_id,
      });

      let editor = reactQuillRef.current.getEditor();
      let currentDelta = editor.getContents();

      console.log("uploading new snapshot delta", currentDelta);

      return templatesRef
        .doc(templateID)
        .collection("snapshots")
        .doc()
        .set({
          delta: { ops: currentDelta.ops },
          createdBy: oauthClaims.email,
          timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
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
    templateID,
    oauthClaims.email,
    oauthClaims.orgID,
    oauthClaims.user_id,
  ]);

  const onEdit = (content, delta, source, editor) => {
    if (source === "user") {
      console.debug("onEdit: setting dirty bit");
      dirty.current = true;
    }
  };

  let archiveDialog = (
    <TemplateDeleteDialog
      templateRef={templatesRef && templatesRef.doc(templateID)}
      open={openDeleteDialog}
      setOpen={setOpenDeleteDialog}
      template={template}
    />
  );

  if (!template || !templateRevision) {
    return <Loading />;
  }

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
              <Paper elevation={5} className={classes.documentPaper}>
                <Grid container>
                  <Grid container item xs={12} alignItems="flex-start">
                    <Grid item xs={11}>
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

                              templateRef.set(
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
                          date={template.creationTimestamp.toDate()}
                        />{" "}
                        by {template.createdBy}
                      </Typography>
                    </Grid>

                    <Grid item xs={1}>
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
                    <ReactQuill
                      ref={reactQuillRef}
                      defaultValue={templateRevision}
                      theme="snow"
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
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Scrollable>
      </Grid>
      {archiveDialog}
    </>
  );
}

function TemplateDeleteDialog({ templateRef, open, setOpen, template }) {
  const { oauthClaims } = useContext(UserAuthContext);
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

    event("delete_template", {
      orgID: oauthClaims.orgID,
      userID: oauthClaims.user_id,
    });
    templateRef.set(
      {
        deletedBy: oauthClaims.email,
        deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    navigate(`/orgs/${orgID}/settings/templates`);
  };

  return (
    <Dialog
      open={open}
      onClose={cancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Archive this template?`}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Mark this template for deletion. This template will no longer be
          visible and will be permanently deleted after thirty days.
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
