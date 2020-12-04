import React, { useCallback, useEffect, useState } from "react";

export default function SuggestionControls({
  suggestionsRef,
  quillRef,
  readyChannelPort,
}) {
  const [suggestions, setSuggestions] = useState();
  const [editorReady, setEditorReady] = useState(false);

  readyChannelPort.onmessage = () => {
    setEditorReady(true);
  };

  const getEditor = useCallback(() => {
    return quillRef.current && quillRef.current.getEditor();
  }, [quillRef]);

  useEffect(() => {
    const editor = getEditor();
    if (!suggestionsRef || !editor) {
      console.debug("suggestionsRef", suggestionsRef);
      console.debug("editor", editor);
      return;
    }

    return suggestionsRef.onSnapshot((snapshot) => {
      setSuggestions(
        snapshot.docs.map((doc) => {
          let suggestion = doc.data();
          suggestion.ID = doc.id;
          suggestion.text = editor.getText(
            suggestion.selection.index,
            suggestion.selection.length
          );
          return suggestion;
        })
      );
    });
  }, [suggestionsRef, getEditor, editorReady]);

  useEffect(() => {
    if (!suggestions) return;
    console.debug("suggestions", suggestions);
  }, [suggestions]);

  return <></>;
}
