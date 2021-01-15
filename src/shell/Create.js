import React, { useState, useRef } from "react";
import Button from "@material-ui/core/Button";
import Popper from "@material-ui/core/Popper";
import Paper from "@material-ui/core/Paper";
import AssignmentIcon from "@material-ui/icons/Assignment";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ExploreIcon from "@material-ui/icons/Explore";
import MenuItem from "@material-ui/core/MenuItem";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import AddIcon from "@material-ui/icons/Add";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import BubbleChartIcon from "@material-ui/icons/BubbleChart";
import AddToPhotosIcon from "@material-ui/icons/AddToPhotos";
import GroupIcon from "@material-ui/icons/Group";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import { useNavigate, useParams } from "react-router-dom";

export default function Create() {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);

  const { orgID } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <Button
        ref={anchorRef}
        onClick={(event) => {
          setOpen(true);
        }}
        startIcon={<AddIcon />}
        style={{
          borderRadius: "2rem",
          textTransform: "none",
          minWidth: "6rem",
        }}
        variant="contained"
        color="secondary"
      >
        Create
      </Button>
      <Popper open={open} anchorEl={anchorRef.current}>
        <ClickAwayListener
          onClickAway={() => {
            setOpen(false);
          }}
        >
          <Paper
            style={{ background: "white", marginTop: "1rem" }}
            elevation={3}
          >
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/interviews/create`);
              }}
            >
              <ListItemIcon>
                <RecordVoiceOverIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Interview" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/interviews/guide`);
              }}
            >
              <ListItemIcon>
                <AddToPhotosIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Interview from guide" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/people/create`);
              }}
            >
              <ListItemIcon>
                <GroupIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Customer" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/boards/create`);
              }}
            >
              <ListItemIcon>
                <BubbleChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Quote Board" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/guides/create`);
              }}
            >
              <ListItemIcon>
                <ExploreIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Guide" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/summaries/create`);
              }}
            >
              <ListItemIcon>
                <AssignmentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Summary" />
            </MenuItem>
            <MenuItem
              onClick={() => {
                setOpen(false);
                navigate(`/orgs/${orgID}/tags/create`);
              }}
            >
              <ListItemIcon>
                <LocalOfferIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Tags" />
            </MenuItem>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
