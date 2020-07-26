import ContentEditable from "react-contenteditable";
import React, { useEffect, useState } from "react";

import { Navigate, useNavigate } from "react-router-dom";

import { Loading } from "../util/Utils.js";

import Content from "../shell/Content.js";
import Tabs from "../shell/Tabs.js";

import DocumentDeleted from "./DocumentDeleted.js";
import DetailsPane from "./DetailsPane.js";
import ContentsPane from "./ContentsPane.js";

// TODO: Wrap editor in it's own class.

export default function Document(props) {
  const navigate = useNavigate();
  const [document, setDocument] = useState();

  let documentRef = props.documentsRef.doc(props.documentID);

  // Subscribe to document name changes
  useEffect(() => {
    if (!props.documentID) {
      return;
    }

    return documentRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }

      let data = doc.data();
      data.ID = doc.id;
      setDocument(data);
    });
  }, [props.documentID]);

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
          <ContentsPane
            document={document}
            documentRef={documentRef}
            tagGroupsRef={props.tagGroupsRef}
          />
        </Tabs.Pane>
        <Tabs.Pane name="Details">
          <DetailsPane
            document={document}
            documentRef={documentRef}
            tagGroupsRef={props.tagGroupsRef}
            peopleRef={props.peopleRef}
          />
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
