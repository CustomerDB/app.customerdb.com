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
        revisionsRef={revisionsRef}
      />
    </>
  );
}
