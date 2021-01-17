export function insertQuote(editor, highlightID, index) {
  console.debug("inserting highlight", highlightID);
  editor.insertEmbed(index, "direct-quote", highlightID, "user");
  editor.insertText(index + 1, "\n", "user");
  editor.setSelection(index + 2);
}

export function insertTheme(editor, boardID, themeID, index) {
  console.debug("inserting highlight", boardID, themeID, index);
  const value = { boardID: boardID, themeID: themeID };
  editor.insertEmbed(index, "embed-theme", value, "user");
  editor.insertText(index + 1, "\n", "user");
  editor.setSelection(index + 2);
}

export function insertBoard(editor, boardID) {
  console.debug("inserting board", boardID);
  // TODO
}
