import * as firebase from "@firebase/testing";

import { initialDelta, onDeltaSnapshot } from "./delta.js";

import Delta from "quill-delta";

beforeEach(async () => {});

afterEach(async () => {});

const makeRef = (initialValue) => {
  return { current: initialValue };
};

const makeChannelPort = (name) => {
  return {
    postMessage: (msg) => {
      console.debug(`channel port [${name}]: ${msg}`);
    },
  };
};

class FakeEditor {
  constructor() {
    this.contents = initialDelta();
    this.selection = { index: 0, length: 0 };
  }

  getSelection() {
    return this.selection;
  }

  setSelection(index, length, source) {
    this.selection.index = index;
    this.selection.length = length;
  }

  getContents() {
    return this.contents;
  }

  updateContents(delta) {
    this.contents = this.contents.compose(delta);
  }

  setContents(delta) {
    this.contents = delta;
  }
}

const makeTimestamp = (seconds, nanoseconds) => {
  return { seconds: seconds, nanoseconds: nanoseconds };
};

const makeContext = () => {
  return {
    uncommittedDeltas: makeRef([]),
    revisionCache: makeRef(),
    editor: new FakeEditor(),
    localDelta: makeRef(new Delta([])),
    readyPort: makeChannelPort("editor ready"),
  };
};

const makeDeltaSnapshot = (deltas) => {
  let deltaDocs = deltas.map((delta) => {
    // Delta data must have ID, timestamp, ops
    expect(delta.ID).toBeDefined();
    expect(delta.timestamp).toBeDefined();
    expect(delta.ops).toBeDefined();

    return {
      exists: true,
      id: delta.ID,
      data: () => delta,
    };
  });

  let snapshot = {
    size: deltaDocs.length,
    docs: deltaDocs,
    forEach: (f) => deltaDocs.forEach(f),
  };

  return snapshot;
};

it("can apply new committed deltas", async () => {
  let {
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort,
  } = makeContext();

  // Set initial revision
  revisionCache.current = {
    delta: initialDelta(),
    timestamp: makeTimestamp(1, 0),
  };

  // Initialize editor with initial revision
  editor.setContents(revisionCache.current.delta);

  // Construct snapshot handler callback function to test
  let callback = onDeltaSnapshot(
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort
  );

  // Create a fake snapshot with two new committed insert deltas
  let snapshot = makeDeltaSnapshot([
    {
      ID: "a",
      timestamp: makeTimestamp(2, 0),
      ops: [
        {
          insert: "hello ",
        },
      ],
    },
    {
      ID: "b",
      timestamp: makeTimestamp(3, 0),
      ops: [
        {
          retain: 6,
        },
        {
          insert: "world",
        },
      ],
    },
  ]);

  // Before receiving snapshot, the editor should have initial contents
  expect(editor.getContents()).toEqual(initialDelta());

  callback(snapshot);

  // After receiving snapshot, the editor should contain inserted text
  expect(editor.getContents()).toEqual({
    ops: [
      {
        insert: "hello world\n",
      },
    ],
  });
});
