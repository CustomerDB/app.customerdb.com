import Quill from "quill";

let Inline = Quill.import("blots/inline");

export default class PlayheadBlot extends Inline {
  static blotName = "playhead";
  static className = "inline-playhead";
  static tagName = "span";

  static create(value) {
    const node = super.create(value);
    return node;
  }

  static formats(domNode) {
    if (domNode.classList.contains("inline-playhead")) {
      return true;
    }
    return super.formats(domNode);
  }

  formats() {
    let formats = super.formats();
    formats["playhead"] = PlayheadBlot.formats(this.domNode);
    return formats;
  }
}
