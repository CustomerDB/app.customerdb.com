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

  let [i] = result;
  let diff = originalRevision.diff(currentRevision);
  return diff.transformPosition(i);
}
