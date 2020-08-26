import Quill from "quill";

// Declare a custom blot subclass to represent highlighted text.
let Inline = Quill.import("blots/inline");

export default class HighlightBlot extends Inline {
  static blotName = "highlight";
  static className = "inline-highlight";
  static tagName = "span";

  static styleClass(tagID) {
    return `tag-${tagID}`;
  }

  static create(value) {
    const node = super.create(value);
    let { highlightID, tagID } = value;
    node.dataset.highlightID = highlightID;
    node.dataset.tagID = tagID;
    node.classList.add(HighlightBlot.styleClass(tagID));
    node.classList.add(`highlight-${highlightID}`);

    return node;
  }

  static formats(domNode) {
    let highlightID = domNode.dataset.highlightID;
    let tagID = domNode.dataset.tagID;
    if (highlightID && tagID) {
      return {
        highlightID: highlightID,
        tagID: tagID,
      };
    }
    return super.formats(domNode);
  }

  formats() {
    let formats = super.formats();
    formats["highlight"] = HighlightBlot.formats(this.domNode);
    return formats;
  }
}
