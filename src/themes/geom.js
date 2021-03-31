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

export function bboxToRect(bbox) {
  return {
    minX: bbox.x,
    minY: bbox.y,
    maxX: bbox.x + bbox.width,
    maxY: bbox.y + bbox.height,
  };
}

export function circumscribingCircle(rect) {
  let width = rect.maxX - rect.minX;
  let height = rect.maxY - rect.minY;

  // compute the circle diameter
  let diameter = Math.sqrt(
    Math.pow(rect.maxX - rect.minX, 2) + Math.pow(rect.maxY - rect.minY, 2)
  );

  let radius = diameter / 2;

  let center = {
    x: rect.minX + width / 2,
    y: rect.minY + height / 2,
  };

  let minX = center.x - radius;
  let minY = center.y - radius;

  return {
    minX: minX,
    minY: minY,
    maxX: minX + diameter,
    maxY: minY + diameter,
    diameter: diameter,
    radius: radius,
    center: center,
  };
}
