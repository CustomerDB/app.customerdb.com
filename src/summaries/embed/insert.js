import Quill from "quill";
import Delta from "quill-delta";

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

export function deleteBlot(reactQuillRef, blotNode) {
  const editor =
    reactQuillRef && reactQuillRef.current && reactQuillRef.current.getEditor();

  if (!editor) return;

  const blot = Quill.find(blotNode, true);

  if (!blot) return;

  const index = editor.getIndex(blot);

  if (!index) return;

  const deleteEmbed = new Delta([{ retain: index }, { delete: 1 }]);

  console.debug("delete blot", editor, blot, index, deleteEmbed);

  editor.updateContents(deleteEmbed, "user");
}
