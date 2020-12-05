import React, { useCallback, useEffect, useState } from "react";
import Popper from '@material-ui/core/Popper';
import Fade from '@material-ui/core/Fade';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';

export default function SuggestionControls({
  suggestionsRef,
  quillRef,
  readyChannelPort,
  suggestionsOpen,
  setSuggestionsOpen,
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

    let suggestionsCopy = Object.assign(suggestions);

    let sortedSuggestions = suggestionsCopy.sort(
      (a, b) => b.prediction.highlights - a.prediction.highlights
    );

    console.debug("top-5 suggestions", sortedSuggestions.slice(0, 5));
  }, [suggestions]);

  console.log("suggestionsOpen", suggestionsOpen);
  console.log("suggestionsOpen", quillRef.current);

  let toolbarElements = document.getElementsByClassName("ql-toolbar");
  let anchor;
  if (toolbarElements.length > 0) {
    anchor = toolbarElements.item(0);
  }

  return quillRef.current ? <Popper open={suggestionsOpen} anchorEl={anchor}>
    <Paper style={{width: "15rem", height: "5rem"}}>
      <Button variant="contained">Previous</Button>
      <Button variant="contained" color="secondary">Next</Button>
    </Paper>
  </Popper> : <></>;
}
