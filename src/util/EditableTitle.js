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

import React, { useCallback, useRef, useState } from "react";
import ContentEditable from "react-contenteditable";
import { v4 as uuidv4 } from "uuid";

export default function EditableTitle({ value, onSave, ...otherProps }) {
  const editValue = useRef();
  const beingEdited = useRef();
  const valueCache = useRef();

  const [renderToken, setRenderToken] = useState();

  valueCache.current = value;

  console.debug("Editable title render token", renderToken);

  const onFocus = useCallback(() => {
    if (!beingEdited.current) {
      // Copy value and block incoming updates.
      editValue.current = valueCache.current;
      beingEdited.current = true;
    }
  }, [editValue, beingEdited]);

  const onChange = useCallback(
    (e) => {
      editValue.current = e.target.value;
    },
    [editValue]
  );

  const onBlur = useCallback(
    (e) => {
      if (!editValue.current) {
        return;
      }
      let newName = e.target.innerText
        .replace(/(\r\n|\n|\r)/gm, " ")
        .replace(/\s+/g, " ")
        .trim();

      let result = onSave(newName);
      if (result) {
        result.then(() => {
          beingEdited.current = false;
          setRenderToken(uuidv4());
        });
      }
    },
    [beingEdited, editValue, onSave]
  );

  return (
    <ContentEditable
      html={!beingEdited.current ? value : editValue.current}
      onFocus={() => onFocus()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.target.blur();
        }
      }}
      onChange={onChange}
      onBlur={onBlur}
      {...otherProps}
    />
  );
}
