import Quill from "quill";

const Embed = Quill.import("blots/embed");

export default class SpeakerBlot extends Embed {
  static blotName = "speaker";
  static className = "speaker";
  static tagName = "div";

  static create(value) {
    let node = super.create();
    node.classList.add(SpeakerBlot.className);
    node.dataset.speakerID = value.ID;
    return node;
  }

  static value(node) {
    return { ID: node.dataset.speakerID };
  }
}
