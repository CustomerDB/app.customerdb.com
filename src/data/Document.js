import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useNavigate } from "react-router-dom";

import DocumentDeleted from "./DocumentDeleted.js";
import ContentsPane from "./ContentsPane.js";

import { Loading } from "../util/Utils.js";
import Content from "../shell/Content.js";
import Tabs from "../shell/Tabs.js";

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
    <Content>
      <Content.Title>
        <Content.Name>{document.name}</Content.Name>
        <Content.Options>{props.options(document)}</Content.Options>
      </Content.Title>
      <Tabs>
        <Tabs.Pane>
          <ContentsPane
            document={document}
            reactQuillRef={props.reactQuillRef}
            editor={props.editor}
          />
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
