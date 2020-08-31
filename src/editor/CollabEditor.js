import React from "react";
import ReactQuill from "react-quill";

export default function CollabEditor({...rest}) {
  return <ReactQuill
    {...rest}
  />;
}
