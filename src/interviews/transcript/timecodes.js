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

// Returns the index into a delta document based on
// the supplied interval tree mapping, and the initial
// delta document the intervals were based on.
//
// @param t                 Time as a number in seconds
// @param timeTree          An interval tree containing [i, j] arrays
// @param originalRevision  A quill delta
// @param currentRevision   A quill delta
export function timeToIndex(t, timeTree, originalRevision, currentRevision) {
  let results = timeTree.search([t, t]);
  if (results.length < 1) return undefined;

  let result = results[0];

  let [i, j] = result;
  let diff = originalRevision.diff(currentRevision);
  return [diff.transformPosition(i), diff.transformPosition(j)];
}

// Returns a time for a given index based on the supplied interval tree mapping
// and the initial delta document the intervals were based on.
//
// @param index             Offset into the document
// @param indexTree         An interval tree containing [s, e] arrays
// @param originalRevision  A quill delta
// @param currentRevision   A quill delta
export function indexToTime(
  index,
  indexTree,
  originalRevision,
  currentRevision
) {
  let diff = currentRevision.diff(originalRevision);
  let currentPosition = diff.transformPosition(index);

  let results = indexTree.search([currentPosition, currentPosition]);
  if (results.length < 1) return undefined;

  let result = results[0];

  let [s] = result;
  return s;
}
