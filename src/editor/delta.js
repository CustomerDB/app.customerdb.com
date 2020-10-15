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

// Returns true if `a` precedes `b` in time.
export function timestampsAreOrdered(a, b) {
  return (
    a.seconds < b.seconds ||
    (a.seconds === b.seconds && a.nanoseconds <= b.nanoseconds)
  );
}

// Returns a delta that contains (only) all of the
// insert operations in the supplied delta.
const justInsertOperations = (delta) => {
  return new Delta(delta.filter((op) => op.insert));
};

// Returns true if the supplied delta is a document;
// that is, it contains only insert operations.
const isDocument = (delta) => {
  if (delta.ops.length === 0) {
    return false;
  }
  let result = true;
  for (let i = 0; i < delta.ops.length; i++) {
    let op = delta.ops[i];
    if (!op.insert) {
      result = false;
      break;
    }
  }
  return result;
};

export function onDeltaSnapshot(
  uncommittedDeltas,
  revisionCache,
  editor,
  localDelta,
  readyPort
) {
  return (snapshot) => {
    let newDeltas = [];

    snapshot.forEach((deltaDoc) => {
      let data = deltaDoc.data();
      let dt = data.timestamp;
      let rct = revisionCache.current.timestamp;
      if (timestampsAreOrdered(dt, rct)) {
        console.debug("skipping delta that predates the revision cache", data);
        return;
      }
      newDeltas.push(data);
    });

    console.debug("newDeltas", JSON.stringify(newDeltas, null, 2));

    newDeltas.forEach((data) => {
      // filter out newly committed deltas from uncommittedDeltas
      uncommittedDeltas.current = uncommittedDeltas.current.filter(
        (d) => d.ID !== data.ID
      );

      let delta = new Delta(data.ops);
      revisionCache.current.delta = revisionCache.current.delta.compose(delta);
      revisionCache.current.timestamp = data.timestamp;
    });

    let editorContents = editor.getContents();

    console.debug("localDelta.current", localDelta.current);
    let inverseLocalDelta = localDelta.current.invert(
      revisionCache.current.delta
    );

    console.debug("Reverting local to", inverseLocalDelta);

    // Compute local: latest revision + old committed deltas +
    //                old uncommitted deltas
    //                == editor content - local delta
    let local = editorContents.compose(inverseLocalDelta);
    console.debug("local", local);

    // Compute remote: latest revision + new committed deltas +
    //                 new uncommitted deltas
    let remote = revisionCache.current.delta;

    if (uncommittedDeltas.current.length > 0) {
      console.debug("uncommittedDeltas.current", uncommittedDeltas.current);
    }

    uncommittedDeltas.current.forEach((delta) => {
      remote = remote.compose(delta);
    });

    // Compute update patch from local to remote

    // Filter trailing delete ops.
    local = justInsertOperations(local);
    remote = justInsertOperations(remote);

    console.debug("remote", remote);

    if (!isDocument(local)) {
      console.debug("local is not a document -- quitting");
      return;
    }
    if (!isDocument(remote)) {
      console.debug("remote is not a document -- quitting");
      return;
    }

    let diff = local.diff(remote);
    console.debug("diff", diff);

    if (diff.ops.length === 0) {
      console.debug("diff is empty; nothing to do");
      return;
    }

    // Unapply the local delta from the editor
    let selection = editor.getSelection();
    let selectionIndex = selection ? selection.index : 0;

    selectionIndex = inverseLocalDelta.transformPosition(selectionIndex);
    console.debug("unapplying local delta", inverseLocalDelta);
    editor.updateContents(inverseLocalDelta);

    // Apply the update patch to the editor
    console.debug("applying remote update patch", diff);
    selectionIndex = diff.transformPosition(selectionIndex);
    editor.updateContents(diff);

    // Re-apply the transformed local delta to the editor

    // Transform the local delta buffer by diff
    console.debug("pre-transformed local delta", localDelta.current);

    // serverFirst means the remote diff happened before the local delta
    const serverFirst = true;

    localDelta.current = diff.transform(localDelta.current, serverFirst);
    console.debug("transformed local delta", localDelta.current);
    selectionIndex = localDelta.current.transformPosition(selectionIndex);
    console.debug("re-applying transformed local delta");
    editor.updateContents(localDelta.current);

    if (selection) {
      console.debug("updating selection index");
      editor.setSelection(selectionIndex, selection.length);
    }

    readyPort.postMessage({});
  };
}
