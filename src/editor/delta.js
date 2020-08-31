import Delta from "quill-delta";

export function initialDelta() {
  return new Delta([{ insert: "\n" }]);
}

// Returns a new delta object representing an empty document.
export function emptyDelta() {
  return new Delta([{ insert: "\n" }]);
}

// Returns the result of folding the supplied array of deltas
// using the item at index 0 as the initial value.
//
// Returns an empty delta if the supplied array is empty.
export function reduceDeltas(deltas) {
  if (deltas.length === 0) {
    return emptyDelta();
  }

  let result = deltas[0];

  deltas.slice(1).forEach((d) => {
    result = result.compose(d);
  });

  return result;
}
