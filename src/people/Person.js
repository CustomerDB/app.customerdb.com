import React, { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import useFirestore from "../db/Firestore.js";

import { Loading } from "../util/Utils.js";
import Content from "../shell/Content.js";
import Scrollable from "../shell/Scrollable.js";

import Tabs from "../shell/Tabs.js";

import PersonContactPane from "./PersonContactPane.js";
import PersonHighlightsPane from "./PersonHighlightsPane.js";

export default function Person(props) {
  const { personID } = useParams();
  const { personRef } = useFirestore();
  const [person, setPerson] = useState();
  const navigate = useNavigate();

  useEffect(() => {
    if (!personRef) {
      return;
    }
    return personRef.onSnapshot((doc) => {
      if (!doc.exists) {
        navigate("/404");
        return;
      }
      setPerson(doc.data());
    });
  }, [personRef, navigate]);

  if (!person) {
    return <Loading />;
  }

  return (
    <Content>
      <Content.Title>
        <Content.Name>{person.name}</Content.Name>
        <Content.Options>{props.options(personID)}</Content.Options>
      </Content.Title>
      <Tabs default="contact">
        <Tabs.Pane key="contact" name="Contact">
          <PersonContactPane person={person} />
        </Tabs.Pane>
        <Tabs.Pane key="clips" name="Clips">
          <PersonHighlightsPane person={person} />
        </Tabs.Pane>
      </Tabs>
    </Content>
  );
}
