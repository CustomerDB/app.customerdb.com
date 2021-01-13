import Quill from "quill";

const Embed = Quill.import("blots/embed");

export default class QuoteBlot extends Embed {
  static blotName = "direct-quote";
  static className = "direct-quote";
  static tagName = "div";
  static onClick = () => {
    console.log("clicked quote");
  };

  static create(value) {
    let node = super.create();
    node.classList.add(QuoteBlot.className);
    node.dataset.highlightID = value;
    // node.setAttribute('contenteditable', 'false');
    node.addEventListener("click", QuoteBlot.onClick);
    return node;
  }

  static value(node) {
    return node.dataset.highlightID;
  }
}
