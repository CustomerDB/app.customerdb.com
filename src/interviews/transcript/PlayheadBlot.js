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
