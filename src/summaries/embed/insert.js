export function insertQuote(editor, highlightID) {
  console.debug("inserting highlight", highlightID);
  editor.insertText(selection.index, "\n", "user");
  editor.insertEmbed(selection.index + 1, "direct-quote", highlightID, "user");
  editor.insertText(selection.index + 2, "\n", "user");
  editor.setSelection(selection.index + 3);
}

export function insertBoard(editor, boardID) {
  console.debug("inserting board", boardID);
  // TODO
}

export function insertTheme(editor, themeID) {
  console.debug("inserting theme", themeID);
  // TODO
}
