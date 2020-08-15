import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useNavigate } from "react-router-dom";

import DocumentDeleted from "./DocumentDeleted.js";
import ContentsPane from "./ContentsPane.js";

import { Loading } from "../util/Utils.js";
import Content from "../shell_obsolete/Content.js";

import Grid from "@material-ui/core/Grid";

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
      <Content>
        <DocumentDeleted document={document} />
      </Content>
    );
  }

  return (
    <Grid container md={10} spacing={0}>
      <ContentsPane
        document={document}
        reactQuillRef={props.reactQuillRef}
        editor={props.editor}
        options={props.options}
      />
    </Grid>
  );
}
