import React, { useCallback, useEffect, useState } from "react";
import Popper from "@material-ui/core/Popper";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import Divider from "@material-ui/core/Divider";
import NavigateNextIcon from "@material-ui/icons/NavigateNext";
import NavigateBeforeIcon from "@material-ui/icons/NavigateBefore";
import CloseIcon from "@material-ui/icons/Close";
import Delta from "quill-delta";

export default function SuggestionControls({
  suggestionsRef,
  revisionsRef,
  quillRef,
  readyChannelPort,
  suggestionsOpen,
  setSuggestionsOpen,
  setHasSuggestions,
}) {
  const [anchor, setAnchor] = useState();
  const [suggestions, setSuggestions] = useState();
  const [topSuggestions, setTopSuggestions] = useState([]);
  const [editorReady, setEditorReady] = useState(0);

  const [revisionID, setRevisionID] = useState();
  const [revisionDelta, setRevisionDelta] = useState();

  const [prefix, setPrefix] = useState();
  const [suggestionText, setSuggestionText] = useState();
  const [suffix, setSuffix] = useState();

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

      setHasSuggestions(newSuggestions.length > 0);
      setSuggestions(newSuggestions);
    });
  }, [suggestionsRef, getEditor, editorReady, setHasSuggestions]);

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
  }, [revisionID, revisionsRef]);

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

  const transformIndex = useCallback(
    (index, length) => {
      const editor = getEditor();
      if (!editor) return;

      // Get current editor delta
      let editorContent = editor.getContents();

      // Compute difference between that and revision
      let diff = revisionDelta.diff(editorContent);

      console.log("diff", diff);

      // Transform index
      let begin = diff.transformPosition(index);
      let end = diff.transformPosition(index + length);
      return {
        transformedIndex: begin,
        transformedLength: end - begin,
      };
    },
    [getEditor, revisionDelta]
  );

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

  const setContext = (editor, transformedIndex, transformedLength) => {
    // Grab context
    const contextSize = 100;
    let contextStart = Math.max(0, transformedIndex - contextSize);
    let contextEnd = Math.min(
      editor.getLength(),
      transformedIndex + transformedLength + contextSize
    );

    let context = editor.getText(contextStart, contextEnd - contextStart);

    let start = transformedIndex - contextStart;
    let end = transformedIndex + transformedLength - contextStart;
    let computedPrefix = context.slice(0, start).trimStart();
    let computedSuffix = context.slice(end).trimEnd();
    if (computedPrefix) computedPrefix = `...${computedPrefix}`;
    if (computedSuffix) computedSuffix = `${computedSuffix}...`;

    setPrefix(computedPrefix);
    setSuggestionText(context.slice(start, end));
    setSuffix(computedSuffix);
  };

  const nextSuggestion = useCallback(() => {
    const editor = getEditor();
    if (!editor) return;
    const selection = editor.getSelection() || { index: 0, length: 0 };
    const selectionIndex = selection.index + selection.length;
    return topSuggestions.find((s) => s.selection.index > selectionIndex);
  }, [getEditor, topSuggestions]);

  const onPrev = () => {
    const editor = getEditor();
    if (!editor) return;
    const prev = prevSuggestion();
    if (prev) {
      const { index, length } = prev.selection;
      let { transformedIndex, transformedLength } = transformIndex(
        index,
        length
      );
      editor.setSelection(transformedIndex, transformedLength, "user");

      setContext(editor, transformedIndex, transformedLength);
    }
  };

  const onNext = useCallback(() => {
    const editor = getEditor();
    if (!editor) return;
    const next = nextSuggestion();
    if (next) {
      const { index, length } = next.selection;

      let { transformedIndex, transformedLength } = transformIndex(
        index,
        length
      );
      editor.setSelection(transformedIndex, transformedLength, "user");

      setContext(editor, transformedIndex, transformedLength);
    }
  }, [getEditor, nextSuggestion, transformIndex]);

  useEffect(() => {
    if (!suggestionsOpen) {
      return;
    }

    onNext();
  }, [suggestionsOpen, onNext]);

  if (!anchor) return <></>;

  return (
    <Popper open={suggestionsOpen} anchorEl={anchor} placement="bottom-end">
      <Paper elevation={3} style={{ maxWidth: "20rem" }}>
        <div style={{ padding: "0.5rem" }}>
          <b>Suggestions</b>
          <Tooltip title="Previous suggestion">
            <IconButton onClick={onPrev}>
              <NavigateBeforeIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Next suggestion">
            <IconButton onClick={onNext}>
              <NavigateNextIcon />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={() => {
              setSuggestionsOpen(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <Divider />
        <div style={{ padding: "0.5rem" }}>
          <p>
            <span className="quoteContext">{prefix}</span>
            <span style={{ backgroundColor: "#FFFBB9" }}>{suggestionText}</span>
            <span className="quoteContext">{suffix}</span>
          </p>
        </div>
      </Paper>
    </Popper>
  );
}
