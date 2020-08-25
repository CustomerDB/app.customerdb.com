import React, { useEffect, useState } from "react";

import ContentsPane from "./ContentsPane.js";
import DocumentDeleted from "./DocumentDeleted.js";
import Grid from "@material-ui/core/Grid";
import { Loading } from "../util/Utils.js";
import useFirestore from "../db/Firestore.js";
import { useNavigate } from "react-router-dom";

export default function Document(props) {
  const { documentRef } = useFirestore();

  const navigate = useNavigate();
  const [document, setDocument] = useState();

  // Subscribe to document name changes
  useEffect(() => {
    if (!documentRef) {
      return;
    }

    return documentRef.onSnapshot((doc) => {
      console.debug("received document snapshot");
      if (!doc.exists) {
        navigate("/404");
        return;
      }

      let data = doc.data();
      data.ID = doc.id;
      setDocument(data);
    });
  }, [navigate, documentRef]);

  if (!document) {
    return <Loading />;
  }

  if (document.deletionTimestamp !== "") {
    return (
      <div>
        <DocumentDeleted document={document} />
      </div>
    );
  }

  if (document.pending) {
    return <Grid container item md={12} lg={9} xl={10} spacing={0}></Grid>;
  }

  return (
    <Grid container item md={12} lg={9} xl={10} spacing={0}>
      <ContentsPane
        document={document}
        reactQuillRef={props.reactQuillRef}
        editor={props.editor}
      />
    </Grid>
  );
}
