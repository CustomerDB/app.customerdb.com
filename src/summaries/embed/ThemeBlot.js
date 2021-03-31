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
