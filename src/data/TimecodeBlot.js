import Quill from "quill";

// Declare a custom blot subclass to represent highlighted text.
let Inline = Quill.import("blots/inline");

export default class TimecodeBlot extends Inline {
  static blotName = "timecode";
  static className = "inline-timecode";
  static tagName = "span";

  static create(value) {
    const node = super.create(value);
    let { start, end } = value;
    node.dataset.start = start;
    node.dataset.end = end;

    return node;
  }

  static formats(domNode) {
    let start = domNode.dataset.start;
    let end = domNode.dataset.end;
    if (start && end) {
      return {
        start: start,
        end: end,
      };
    }
    return super.formats(domNode);
  }

  formats() {
    let formats = super.formats();
    formats["timecode"] = TimecodeBlot.formats(this.domNode);
    return formats;
  }
}
