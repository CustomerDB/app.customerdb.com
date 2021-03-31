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
    node.setAttribute("contenteditable", "false");
    node.addEventListener("click", QuoteBlot.onClick);
    return node;
  }

  static value(node) {
    return node.dataset.highlightID;
  }
}
