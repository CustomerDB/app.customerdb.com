import React, { useCallback, useEffect, useState } from "react";
import Popper from "@material-ui/core/Popper";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Delta from "quill-delta";

export default function SuggestionControls({
  suggestionsRef,
  revisionsRef,
  quillRef,
  readyChannelPort,
  suggestionsOpen,
  setSuggestionsOpen,
}) {
  const [anchor, setAnchor] = useState();
  const [suggestions, setSuggestions] = useState();
  const [topSuggestions, setTopSuggestions] = useState([]);
  const [editorReady, setEditorReady] = useState(0);

  const [revisionID, setRevisionID] = useState();
  const [revisionDelta, setRevisionDelta] = useState();

  readyChannelPort.onmessage = () => {
    setEditorReady(editorReady + 1);
  };

  const getEditor = useCallback(() => {
    return quillRef.current && quillRef.current.getEditor();
  }, [quillRef]);

  // subscribe to suggestions collection and sort by
  // confidence of highlight
  useEffect(() => {
    const editor = getEditor();
    if (!suggestionsRef || !editor) {
      console.debug("suggestionsRef", suggestionsRef);
      console.debug("editor", editor);
      return;
    }

    return suggestionsRef.onSnapshot((snapshot) => {
      const newSuggestions = snapshot.docs.map((doc) => {
        let suggestion = doc.data();
        suggestion.ID = doc.id;
        const { index, length } = suggestion.selection;
        suggestion.text = editor.getText(index, length);
        return suggestion;
      });

      newSuggestions.sort((a, b) => {
        return b.prediction.highlights - a.prediction.highlights;
      });

      if (newSuggestions.length > 0) {
        setRevisionID(newSuggestions[0].revisionID);
      }

      setSuggestions(newSuggestions);
    });
  }, [suggestionsRef, getEditor, editorReady]);

  // Fetch revision delta to compute the transform delta for the suggestion indexes.
  useEffect(() => {
    if (!revisionID || !revisionsRef) {
      return;
    }

    return revisionsRef.doc(revisionID).onSnapshot((doc) => {
      let revision = doc.data();
      if (!revision.delta) {
        return;
      }

      setRevisionDelta(new Delta(revision.delta.ops));
    });
  }, [revisionID]);

  useEffect(() => {
    if (!editorReady || !quillRef.current) return;
    let toolbarElements = document.getElementsByClassName("ql-toolbar");
    setAnchor(toolbarElements.item(0)); // .item returns undefined if empty
  }, [quillRef, editorReady]);

  const containsHighlight = (suggestion, editor) => {
    const { index, length } = suggestion.selection;
    const contents = editor.getContents(index, length);
    return contents.ops.find((op) => {
      return op.attributes && op.attributes.highlight;
    });
  };

  // compute top suggestions:
  // - not overlapping with existing highlights
  // - in document order
  useEffect(() => {
    const editor = getEditor();
    if (!suggestions || !editor) return;
    const newTopSuggestions = [];
    const numSuggestions = 5;
    for (
      let i = 0;
      i < suggestions.length && newTopSuggestions.length < numSuggestions;
      i++
    ) {
      const suggestion = suggestions[i];
      if (containsHighlight(suggestion, editor)) {
        continue;
      }
      newTopSuggestions.push(suggestion);
    }
    newTopSuggestions.sort((a, b) => {
      return a.selection.index - b.selection.index;
    });
    setTopSuggestions(newTopSuggestions);
  }, [suggestions, editorReady, getEditor]);

  useEffect(() => {
    console.debug("top suggestions", topSuggestions);
  }, [topSuggestions]);

  const transformIndex = (index) => {
    const editor = getEditor();
    if (!editor) return;

    // Get current editor delta
    let editorContent = editor.getContents();

    // Compute difference between that and revision
    let diff = revisionDelta.diff(editorContent);

    console.log("diff", diff);

    // Transform index
    return diff.transformPosition(index);
  };

  const prevSuggestion = () => {
    const editor = getEditor();
    if (!editor) return;
    const selection = editor.getSelection() || { index: 0, length: 0 };
    const selectionIndex = selection.index;

    console.debug("selectionIndex", selectionIndex);

    const reverseTopSuggestions = [...topSuggestions];
    reverseTopSuggestions.sort((a, b) => {
      return b.selection.index - a.selection.index;
    });

    console.debug("reverseTopSuggestions", reverseTopSuggestions);

    return reverseTopSuggestions.find(
      (s) => s.selection.index < selectionIndex
    );
  };

  const nextSuggestion = () => {
    const editor = getEditor();
    if (!editor) return;
    const selection = editor.getSelection() || { index: 0, length: 0 };
    const selectionIndex = selection.index + selection.length;
    return topSuggestions.find((s) => s.selection.index > selectionIndex);
  };

  const onPrev = () => {
    const editor = getEditor();
    if (!editor) return;
    const prev = prevSuggestion();
    if (prev) {
      const { index, length } = prev.selection;
      editor.setSelection(index, length, "user");
    }
  };

  const onNext = () => {
    const editor = getEditor();
    if (!editor) return;
    const next = nextSuggestion();
    if (next) {
      const { index, length } = next.selection;

      let transformedIndex = transformIndex(index);

      editor.setSelection(transformedIndex, length, "user");
    }
  };

  if (!anchor) return <></>;

  return (
    <Popper open={suggestionsOpen} anchorEl={anchor}>
      <Paper elevation={3} style={{ padding: "2rem" }}>
        <h2>Suggest Highlights</h2>
        <Button variant="contained" onClick={onPrev}>
          Previous
        </Button>
        <Button variant="contained" onClick={onNext}>
          Next
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSuggestionsOpen(false);
          }}
        >
          X
        </Button>
      </Paper>
    </Popper>
  );
}
