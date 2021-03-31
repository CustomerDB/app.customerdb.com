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

import React, { useRef } from "react";

import CollabEditor from "./CollabEditor.js";
import HighlightControls from "./HighlightControls.js";
import SuggestionControls from "./SuggestionControls.js";

const makePortPair = () => {
  const chan = new MessageChannel();
  return [chan.port1, chan.port2];
};

export default function HighlightCollabEditor({
  quillRef,
  document,
  revisionsRef,
  highlightsRef,
  suggestionsRef,
  tags,
  onChangeSelection,
  onReady,
  suggestionsOpen,
  setSuggestionsOpen,
  setHasSuggestions,
  ...otherProps
}) {
  const [selectionSend, selectionReceive] = makePortPair();
  const [readySend1, readyReceive1] = makePortPair();
  const [readySend2, readyReceive2] = makePortPair();
  const initialScrollRef = useRef();

  // thisOnChangeSelection is invoked when the content selection changes, including
  // whenever the cursor changes position.
  const thisOnChangeSelection = (range, source, editor) => {
    if (source !== "user" || range === null) {
      return;
    }
    selectionSend.postMessage(range);

    if (onChangeSelection) {
      onChangeSelection(range, source, editor);
    }
  };

  const thisOnReady = () => {
    readySend1.postMessage({});
    readySend2.postMessage({});
    if (onReady) {
      onReady();
    }
  };

  return (
    <>
      <CollabEditor
        quillRef={quillRef}
        onChangeSelection={thisOnChangeSelection}
        onReady={thisOnReady}
        revisionsRef={revisionsRef}
        {...otherProps}
      />
      <HighlightControls
        quillRef={quillRef}
        initialScrollRef={initialScrollRef}
        selectionChannelPort={selectionReceive}
        readyChannelPort={readyReceive1}
        highlightsRef={highlightsRef}
        highlightDocument={document}
        tags={tags}
      />
      <SuggestionControls
        quillRef={quillRef}
        suggestionsRef={suggestionsRef}
        readyChannelPort={readyReceive2}
        suggestionsOpen={suggestionsOpen}
        setSuggestionsOpen={setSuggestionsOpen}
        setHasSuggestions={setHasSuggestions}
        revisionsRef={revisionsRef}
      />
    </>
  );
}
