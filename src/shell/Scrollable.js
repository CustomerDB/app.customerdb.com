import React from "react";

export default function Scrollable({ children, ...otherProps }) {
  return (
    <div className="scrollContainer h-100">
      <div className="scroll" {...otherProps}>
        {children}
      </div>
    </div>
  );
}
