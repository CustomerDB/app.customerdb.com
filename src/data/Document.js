import React, { useEffect, useState } from "react";

import useFirestore from "../db/Firestore.js";

import { useNavigate, useParams } from "react-router-dom";

import DocumentDeleted from "./DocumentDeleted.js";
import DetailsPane from "./DetailsPane.js";
import ContentsPane from "./ContentsPane.js";

import { Loading } from "../util/Utils.js";
import Content from "../shell/Content.js";
import Tabs from "../shell/Tabs.js";

export default function Document(props) {
  const { documentRef } = useFirestore();

  const navigate = useNavigate();
  const { documentID } = useParams();
  const [document, setDocument] = useState();

  // Subscribe to document name changes
  useEffect(() => {
    console.warn("document useEffect");
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
  }, [documentID]);

  if (!document) {
    return <Loading />;
  }

  if (document.deletionTimestamp !== "") {
    return <DocumentDeleted />;
  }

  return (
    <Content>
      <Content.Title>
        <Content.Name>{document.name}</Content.Name>
      </Content.Title>
      <Tabs default="Content">
        <Tabs.Pane name="Content">
          <ContentsPane document={document} />
        </Tabs.Pane>
        <Tabs.Pane name="Details">
          <DetailsPane document={document} />
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
