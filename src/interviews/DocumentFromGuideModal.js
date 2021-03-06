// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useContext, useEffect, useState } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Grid from "@material-ui/core/Grid";
import TemplateSelector from "./TemplateSelector.js";
import useFirestore from "../db/Firestore.js";
import { useOrganization } from "../organization/hooks.js";
import FirebaseContext from "../util/FirebaseContext.js";

export default function DocumentFromGuideModal({ show, onHide, documentID }) {
  const { documentsRef, templatesRef } = useFirestore();
  const [template, setTemplate] = useState();
  const firebase = useContext(FirebaseContext);
  const { defaultTagGroupID } = useOrganization();

  const [documentRef, setDocumentRef] = useState();

  useEffect(() => {
    if (!documentsRef || !documentID) {
      setDocumentRef();
      return;
    }

    setDocumentRef(documentsRef.doc(documentID));
  }, [documentsRef, documentID]);

  useEffect(() => {
    if (!documentRef) return;

    documentRef.get().then((snapshot) => {
      if (snapshot.size === 0) {
        return;
      }

      let data = snapshot.data();
      data.ID = snapshot.id;
    });
  }, [show, documentRef]);

  const onSave = () => {
    if (!documentRef || !templatesRef || !defaultTagGroupID) {
      return;
    }

    let templatePromise = Promise.resolve();

    let templateID = "";
    let tagGroupID = defaultTagGroupID;

    if (template) {
      templateID = template.ID;
      tagGroupID = template.tagGroupID || "";

      templatePromise = templatesRef
        .doc(templateID)
        .collection("snapshots")
        .orderBy("timestamp", "desc")
        .limit(1)
        .get()
        .then((snapshot) => {
          if (snapshot.size === 0) return;
          let templateRevision = snapshot.docs[0].data();
          return documentRef.collection("revisions").doc().set({
            delta: templateRevision.delta,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          });
        });
    }

    return templatePromise
      .then(() =>
        documentRef.update({
          needsIndex: true,
          templateID: templateID,
          tagGroupID: tagGroupID,
        })
      )
      .then(onHide);
  };

  return (
    <Dialog
      open={show}
      onClose={onHide}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{`New interview from guide`}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid container item>
            <Grid item xs={12}>
              <TemplateSelector
                onChange={setTemplate}
                documentID={documentID}
              />
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onSave}>Continue</Button>
      </DialogActions>
    </Dialog>
  );
}
