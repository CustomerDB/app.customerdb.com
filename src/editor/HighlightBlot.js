// Copyright 2021 Quantap Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import Quill from "quill";

// Declare a custom blot subclass to represent highlighted text.
let Inline = Quill.import("blots/inline");

Inline.order = [
  "playhead",
  "cursor",
  "inline", // Must be lower
  "link", // Chrome wants <a> to be lower
  "underline",
  "strike",
  "italic",
  "bold",
  "script",
  "code",
  "highlight",
];

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
