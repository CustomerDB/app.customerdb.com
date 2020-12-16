import React, { useState, useRef } from "react";
import Button from "@material-ui/core/Button";
import Popper from "@material-ui/core/Popper";
import Paper from "@material-ui/core/Paper";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ExploreIcon from "@material-ui/icons/Explore";
import MenuItem from "@material-ui/core/MenuItem";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import AddIcon from "@material-ui/icons/Add";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import MultilineChartIcon from "@material-ui/icons/MultilineChart";
import AddToPhotosIcon from "@material-ui/icons/AddToPhotos";
import GroupIcon from "@material-ui/icons/Group";
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
                navigate(`/orgs/${orgID}/analyze/create`);
              }}
            >
              <ListItemIcon>
                <MultilineChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Analysis" />
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
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
