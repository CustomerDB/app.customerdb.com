import React, { useContext, useEffect, useState } from "react";
import UserAuthContext from "../auth/UserAuthContext.js";
import FirebaseContext from "../util/FirebaseContext.js";
import { useParams } from "react-router-dom";
import useFirestore from "../db/Firestore.js";
import event from "../analytics/event.js";
import colorPair from "../util/color.js";
import { v4 as uuidv4 } from "uuid";
import { Loading } from "../util/Utils.js";
import TagGroupDeleteDialog from "./TagGroupDeleteDialog.js";
import Grid from "@material-ui/core/Grid";
import ColorPicker from "./ColorPicker.js";
import TextField from "@material-ui/core/TextField";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Chip from "@material-ui/core/Chip";
import Card from "@material-ui/core/Card";
import Popper from "@material-ui/core/Popper";
import MenuItem from "@material-ui/core/MenuItem";
import CardContent from "@material-ui/core/CardContent";
import EditableTitle from "../util/EditableTitle";
import IconButton from "@material-ui/core/IconButton";
import { useOrganization } from "../organization/hooks.js";
import StarIcon from "@material-ui/icons/Star";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Menu from "@material-ui/core/Menu";
import ArchiveIcon from "@material-ui/icons/Archive";
import Divider from "@material-ui/core/Divider";

export default function TagGroup({ tagGroupID }) {
  const { oauthClaims } = useContext(UserAuthContext);
  const firebase = useContext(FirebaseContext);
  const { orgID } = useParams();
  const { tagGroupsRef, orgRef } = useFirestore();
  const [tagGroupRef, setTagGroupRef] = useState();
  const [tagGroup, setTagGroup] = useState();
  const [tags, setTags] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const { defaultTagGroupID } = useOrganization();
  const [openTag, setOpenTag] = useState();

  const [optionsAnchorEl, setOptionsAnchorEl] = useState(null);
  const [chipAnchorEl, setChipAnchorEl] = useState(null);

  const [openTagName, setOpenTagName] = useState();

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

        snapshot.forEach((doc) => {
          let data = doc.data();
          data["ID"] = doc.id;
          newTags.push(data);
        });

        setTags(newTags);
      });
    return unsubscribe;
  }, [tagGroupRef]);

  const onAddTag = () => {
    if (!tagGroupRef) return;

    event(firebase, "create_tag", {
      orgID: orgID,
      userID: oauthClaims.user_id,
    });

    let color = colorPair();
    let newTagID = uuidv4();

    tagGroupRef.collection("tags").doc(newTagID).set({
      ID: newTagID,
      tagGroupID: tagGroupID,
      name: "Untitled tag",
      organizationID: orgID,
      color: color.background,
      textColor: color.foreground,
      createdBy: oauthClaims.email,
      creationTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
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

  const handleChipClick = (event) => {
    setChipAnchorEl(event.currentTarget);
  };

  const handleChipClose = () => {
    setChipAnchorEl(null);
  };

  let tagDetails = tags.map((tag) => (
    <>
      <Chip
        size="small"
        label={tag.name}
        onClick={(event) => {
          handleChipClick(event);
          setOpenTag(tag);
          setOpenTagName(tag.name);
        }}
        style={{
          backgroundColor: tag.color,
          color: tag.textColor,
          fontWeight: "bold",
          marginRight: "0.5rem",
          marginTop: "1rem",
        }}
      />
    </>
  ));

  const isDefaultTagGroup = tagGroup.ID === defaultTagGroupID;

  return (
    <>
      <Grid container item xs={12}>
        <Card style={{ width: "100%", margin: "1rem" }}>
          <CardContent>
            <Grid container>
              <Grid container item xs={11}>
                <p>
                  <b>
                    <EditableTitle
                      value={tagGroup.name}
                      onSave={(name) => {
                        if (tagGroupRef) {
                          let newName = name
                            .replace(/(\r\n|\n|\r)/gm, " ")
                            .replace(/\s+/g, " ")
                            .trim();

                          return tagGroupRef.update({ name: newName });
                        }
                      }}
                    />
                  </b>
                </p>
              </Grid>
              <Grid container item xs={1} justify="flex-end">
                <IconButton
                  edge="end"
                  color="inherit"
                  onClick={(event) => {
                    setOptionsAnchorEl(event.currentTarget);
                  }}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  id="profile-menu"
                  anchorEl={optionsAnchorEl}
                  keepMounted
                  open={Boolean(optionsAnchorEl)}
                  onClose={() => {
                    setOptionsAnchorEl(null);
                  }}
                >
                  <MenuItem
                    onClick={() => {
                      setOptionsAnchorEl(null);
                      orgRef.update({ defaultTagGroupID: tagGroup.ID });
                    }}
                    disabled={isDefaultTagGroup}
                  >
                    <ListItemIcon>
                      <StarIcon />
                    </ListItemIcon>
                    Make default
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setOptionsAnchorEl(null);
                      setOpenDeleteDialog(true);
                    }}
                    disabled={isDefaultTagGroup}
                  >
                    <ListItemIcon>
                      <ArchiveIcon />
                    </ListItemIcon>
                    Archive
                  </MenuItem>
                </Menu>
              </Grid>
            </Grid>

            {tagGroup.ID === defaultTagGroupID && (
              <Grid container item xs={12}>
                <p>Default group will be set on all new interviews</p>
              </Grid>
            )}

            <div style={{ paddingLeft: "4rem" }}>
              {tagDetails}
              <Chip
                size="small"
                label="+"
                onClick={() => {
                  onAddTag();
                }}
                style={{
                  backgroundColor: "white",
                  fontWeight: "bold",
                  marginRight: "0.5rem",
                  marginTop: "1rem",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </Grid>
      {archiveDialog}
      <Popper open={Boolean(chipAnchorEl)} anchorEl={chipAnchorEl}>
        <ClickAwayListener onClickAway={handleChipClose}>
          <Card
            elevation={3}
            style={{
              width: "15rem",
            }}
          >
            <TextField
              style={{ padding: "1rem" }}
              fullWidth
              placeholder="Name"
              value={openTagName}
              InputProps={{
                disableUnderline: true,
              }}
              onChange={(e) => {
                setOpenTagName(e.target.value);

                tagGroupRef
                  .collection("tags")
                  .doc(openTag.ID)
                  .update({ name: e.target.value });
              }}
              onKeyDown={checkReturn}
            />
            <Divider style={{ marginBottom: "0.5rem" }} />
            <div style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>
              <ColorPicker tag={openTag} tagGroupRef={tagGroupRef} />
            </div>
            <Divider style={{ marginTop: "0.5rem" }} />
            <MenuItem
              onClick={() => {
                event(firebase, "delete_tag", {
                  orgID: orgID,
                  userID: oauthClaims.user_id,
                });

                console.debug("TODO: use a modal for this instead");
                let proceed = window.confirm(
                  `This will remove highlights associated with this tag.\nAre you sure you want to delete it?`
                );

                if (!proceed) {
                  console.debug(
                    "user declined to proceeed with deleting the tag"
                  );
                  return;
                }

                tagGroupRef.collection("tags").doc(openTag.ID).update({
                  deletedBy: oauthClaims.email,
                  deletionTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                });

                handleChipClose();
              }}
            >
              Delete tag
            </MenuItem>
          </Card>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
