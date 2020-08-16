import React, { useContext } from 'react';

import UserAuthContext from "../auth/UserAuthContext.js";
import useFirestore from "../db/Firestore.js";
import event from "../analytics/event.js";

import { useParams, useNavigate } from "react-router-dom";

import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

export default function AlertDialog({open, setOpen, document}) {

  const { oauthClaims } = useContext(UserAuthContext);
	const { orgID } = useParams();
	const { documentsRef } = useFirestore();
	const navigate = useNavigate();

  const cancel = () => {
    setOpen(false);
  };

	const archive = () => {
		if (!documentsRef || !oauthClaims || !oauthClaims.email || !document || !document.ID) {
			setOpen(false);
			return;
		}

		event("delete_data", {
			orgID: oauthClaims.orgID,
			userID: oauthClaims.user_id,
		});
		documentsRef.doc(document.ID).update({
			deletedBy: oauthClaims.email,
			deletionTimestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
		}).then(() => {
			navigate(`/orgs/${orgID}/data`);
			setOpen(false);
		});
	};

  return (
		<Dialog
			open={open}
			onClose={cancel}
			aria-labelledby="alert-dialog-title"
			aria-describedby="alert-dialog-description"
		>
			<DialogTitle id="alert-dialog-title">{`Archive this document?`}</DialogTitle>
			<DialogContent>
				<DialogContentText id="alert-dialog-description">
					Mark this document for deletion. This document will no longer be visible
					and will be permanently deleted after thirty days.
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
