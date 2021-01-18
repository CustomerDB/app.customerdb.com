import React, { useEffect, useRef, useState } from "react";

import Draggable from "react-draggable";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Quill from "quill";
import { debounce } from "debounce";

export default function Hit({ reactQuillRef, onDrop, children }) {
  const [drag, setDrag] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cardRect, setCardRect] = useState();
  const [scrollTop, setScrollTop] = useState(0);
  const cardRef = useRef();

  const handleDragStart = (e) => {
    const cardRect = cardRef.current.getBoundingClientRect();
    const scrollPane = document.getElementById("summary-sidebar-scroll");
    setScrollTop(scrollPane.scrollTop);
    setCardRect(cardRect);
    setDrag(true);
  };

  const updateCursor = debounce((e) => {
    const editor =
      reactQuillRef &&
      reactQuillRef.current &&
      reactQuillRef.current.getEditor();

    if (!editor) return;
    const dropTarget = document.elementFromPoint(e.x, e.y);
    if (dropTarget && editor.container.contains(dropTarget)) {
      const blot = Quill.find(dropTarget, true);
      if (!blot) return;
      let insertIndex = 0;

      if (!blot.cache || !blot.cache.length) {
        insertIndex = editor.getLength();
      } else {
        const blotStart = editor.getIndex(blot);
        insertIndex = blotStart + blot.cache.length;
      }
      editor.setSelection(insertIndex);
    }
  }, 1000);

  useEffect(() => {
    updateCursor.clear();
  }, [updateCursor]);

  const handleDrag = (e) => {
    setPosition({
      x: e.x - cardRect.x,
      y: e.y - cardRect.y - scrollTop,
    });
    updateCursor.clear();
    updateCursor(e);
  };

  const handleDragStop = (e) => {
    setPosition({ x: 0, y: 0 });
    setDrag(false);

    const editor =
      reactQuillRef &&
      reactQuillRef.current &&
      reactQuillRef.current.getEditor();

    if (!editor) return;

    const dropTarget = document.elementFromPoint(e.x, e.y);
    if (dropTarget && editor.container.contains(dropTarget)) {
      const blot = Quill.find(dropTarget, true);
      if (!blot) return;
      let insertIndex = 0;

      if (!blot.cache || !blot.cache.length) {
        insertIndex = editor.getLength();
      } else {
        const blotStart = editor.getIndex(blot);
        insertIndex = blotStart + blot.cache.length;
      }
      onDrop(editor, insertIndex);
    }
  };

  const card = (
    <Card
      ref={cardRef}
      style={{
        zIndex: "99",
        position: drag ? "absolute" : "relative",
        width: drag ? cardRect.width : "100%",
        margin: "0.5rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        opacity: drag ? 0.75 : 1.0,
      }}
    >
      <CardContent>{children}</CardContent>
    </Card>
  );

  let placeholder = <></>;

  if (drag) {
    placeholder = (
      <Card
        key="drag-placeholder"
        style={{
          position: "relative",
          width: "100%",
          padding: 0,
          margin: "0.5rem",
          borderRadius: "0.5rem",
          height: `${cardRect.height}px`,
          backgroundColor: "#fafafa",
        }}
      ></Card>
    );
  }

  return (
    <>
      <Draggable
        position={position}
        axis="none"
        nodeRef={cardRef}
        onStart={handleDragStart}
        onDrag={handleDrag}
        onStop={handleDragStop}
      >
        {card}
      </Draggable>
      {placeholder}
    </>
  );
}
