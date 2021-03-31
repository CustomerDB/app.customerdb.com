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

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Chip from "@material-ui/core/Chip";
import { v4 as uuidv4 } from "uuid";

export default function HighlightHints({ toolbarHeight, highlights, tags }) {
  const [reflow, setReflow] = useState();
  useEffect(() => {}, [reflow]);

  useEffect(() => {
    let cancel = setInterval(() => {
      setReflow(uuidv4());
    }, 500);
    return () => {
      clearInterval(cancel);
    };
  }, []);

  if (!highlights || !tags) {
    return <></>;
  }

  let toolbarOffset = toolbarHeight - 8;

  let hints = Object.values(highlights).map((highlight) => {
    let highlightDomID = `highlight-${highlight.ID}`;
    let hintDomID = `${highlightDomID}-hint`;
    let highlightNodes = document.getElementsByClassName(highlightDomID);

    if (!highlightNodes || highlightNodes.length === 0) return undefined;

    let highlightNode = highlightNodes[0];

    let tagID = highlight.tagID;
    let tag = tags[tagID];

    if (!tag) return <></>;

    return (
      <Hint
        id={hintDomID}
        key={hintDomID}
        tag={tag}
        highlightID={highlight.ID}
        offsetTop={highlightNode.offsetTop + toolbarOffset}
      />
    );
  });

  return hints;
}

function Hint({ tag, highlightID, offsetTop }) {
  const [expand, setExpand] = useState(false);
  const { orgID, documentID, tabID } = useParams();
  const navigate = useNavigate();
  let label = expand ? tag.name : tag.name[0];

  let chip = (
    <Chip
      label={label}
      onClick={() => {
        let target = tabID
          ? `/orgs/${orgID}/interviews/${documentID}/${tabID}?quote=${highlightID}`
          : `/orgs/${orgID}/interviews/${documentID}?quote=${highlightID}`;
        navigate(target);
      }}
      onMouseOver={() => {
        setExpand(true);
      }}
      onMouseOut={() => {
        setExpand(false);
      }}
      style={{
        background: tag.color,
        color: tag.textColor,
        position: "absolute",
        top: offsetTop,
        right: "-3rem",
      }}
    />
  );

  return chip;
}
