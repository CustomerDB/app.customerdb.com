import React, { useRef, useState, useEffect } from "react";
import { CirclePicker } from "react-color";
import { getTextColorForBackground } from "../util/color.js";

export default function ColorPicker(props) {
  const ref = useRef(null);
  const [colorPickerOpen, setColorPickerOpen] = useState();

  useEffect(() => {
    const handleClose = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setColorPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
    };
  }, [ref]);

  return (
    <CirclePicker
      width="15rem"
      color={props.tag.color}
      onChangeComplete={(color) => {
        props.tagGroupRef
          .collection("tags")
          .doc(props.tag.ID)
          .update({
            color: color.hex,
            textColor: getTextColorForBackground(color.hex),
          });

        setColorPickerOpen(false);
      }}
    />
  );
}
