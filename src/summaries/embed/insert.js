export function insertQuote(editor, highlightID, index) {
  console.debug("inserting highlight", highlightID);
  editor.insertEmbed(index, "direct-quote", highlightID, "user");
  editor.insertText(index + 1, "\n", "user");
  editor.setSelection(index + 2);
}

export function insertBoard(editor, boardID) {
  console.debug("inserting board", boardID);
  // TODO
}

export function insertTheme(editor, themeID) {
  console.debug("inserting theme", themeID);
  // TODO
}
