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

import React from "react";
import { circumscribingCircle } from "./geom.js";

export function computeThemeBounds(cards) {
  let rect = {};

  if (cards.length > 0) {
    let card0 = cards[0];
    rect.minX = card0.minX;
    rect.minY = card0.minY;
    rect.maxX = card0.maxX;
    rect.maxY = card0.maxY;
    cards.forEach((card) => {
      rect.minX = Math.min(rect.minX, card.minX);
      rect.minY = Math.min(rect.minY, card.minY);
      rect.maxX = Math.max(rect.maxX, card.maxX);
      rect.maxY = Math.max(rect.maxY, card.maxY);
    });
  }

  return rect;
}

export default function Theme({ name, theme, cards, setSidepaneTheme }) {
  if (cards === undefined || cards.length < 2) {
    return <></>;
  }

  let rect = computeThemeBounds(cards);
  theme.minX = rect.minX;
  theme.minY = rect.minY;
  theme.maxX = rect.maxX;
  theme.maxY = rect.maxY;

  let circle = circumscribingCircle(rect);
  let color = theme.color;

  let border = `2px ${color} solid`;

  return (
    <>
      <div
        className="theme"
        style={{
          position: "absolute",
          left: circle.minX,
          top: circle.minY,
          width: circle.diameter,
          height: circle.diameter,
          borderRadius: "50%",
          border: border,
          backgroundColor: `${color}`,
          opacity: 0.5,
        }}
      >
        {}
      </div>

      <div
        className="themeLabel"
        style={{
          position: "absolute",
          left: circle.minX,
          top: circle.maxY + 10,
          width: circle.diameter,
          textAlign: "center",
          cursor: "pointer",
        }}
        onClick={() => {
          setSidepaneTheme(theme);
        }}
      >
        <div className="d-flex justify-content-center">
          <div className="align-self-center">{name}</div>
        </div>
      </div>
    </>
  );
}
