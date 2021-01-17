import Quill from "quill";

const Embed = Quill.import("blots/embed");

export default class ThemeBlot extends Embed {
  static blotName = "embed-theme";
  static className = "embed-theme";
  static tagName = "div";
  static onClick = () => {
    console.log("clicked theme");
  };

  static create(value) {
    let node = super.create();
    node.classList.add(ThemeBlot.className);
    const { boardID, themeID } = value;
    node.dataset.boardID = boardID;
    node.dataset.themeID = themeID;
    node.setAttribute("contenteditable", "false");
    node.addEventListener("click", ThemeBlot.onClick);
    return node;
  }

  static value(node) {
    return {
      boardID: node.dataset.boardID,
      themeID: node.dataset.themeID,
    };
  }
}
