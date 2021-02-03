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
      let result = onSave(e.target.innerText);
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
