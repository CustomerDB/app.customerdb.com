import React from "react";
import { CirclePicker } from "react-color";
import { getTextColorForBackground } from "../util/color.js";

export default function ColorPicker(props) {
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
      }}
    />
  );
}
