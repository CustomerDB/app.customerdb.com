import React, { useCallback, useRef } from "react";
import ContentEditable from "react-contenteditable";

export default function EditableTitle({ value, onSave, ...otherProps }) {
  const editValue = useRef();
  const beingEdited = useRef();
  const valueCache = useRef();

  valueCache.current = value;

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

  const onBlur = useCallback(() => {
    if (!editValue.current) {
      return;
    }
    let result = onSave(editValue.current);
    if (result) {
      result.then(() => {
        beingEdited.current = false;
      });
    }
  }, [beingEdited, editValue, onSave]);

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
