import React, { useRef } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import Link from "@material-ui/core/Link";

export default function CallInfoDialog({ open, setOpen, callLink }) {
  const inviteTextRef = useRef();

  if (!callLink) return <></>;

  const copyInvite = () => {
    let node = inviteTextRef.current;
    if (!node) {
      return;
    }
    let inviteText = node.textContent.toString();
    navigator.clipboard.writeText(inviteText);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`Call Details`}</DialogTitle>
      <DialogContent>
        <DialogContentText ref={inviteTextRef} id="alert-dialog-description">
          Join call with CustomerDB: <Link href={callLink}>{callLink}</Link>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button startIcon={<FileCopyOutlinedIcon />} onClick={copyInvite}>
          Copy to clipboard
        </Button>
      </DialogActions>
    </Dialog>
  );
}
