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
  let snapshot1 = makeDeltaSnapshot([
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

  callback(snapshot1);

  // After receiving snapshot, the editor should contain inserted text
  expect(editor.getContents()).toEqual({
    ops: [
      {
        insert: "hello world\n",
      },
    ],
  });

  // Create a fake snapshot with one new delete delta
  let snapshot2 = makeDeltaSnapshot([
    {
      ID: "c",
      timestamp: makeTimestamp(4, 0),
      ops: [
        {
          retain: 5,
        },
        {
          delete: 6,
        },
      ],
    },
  ]);

  callback(snapshot2);

  // After receiving snapshot, the editor should contain one word
  expect(editor.getContents()).toEqual({
    ops: [
      {
        insert: "hello\n",
      },
    ],
  });
});

it("can preserve local edits and apply new deltas", async () => {
  let {
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort,
  } = makeContext();

  // Set initial revision
  revisionCache.current = {
    delta: new Delta([{ insert: "hello\n" }]),
    timestamp: makeTimestamp(1, 0),
  };

  // Initialize editor with initial revision
  editor.setContents(revisionCache.current.delta);

  localDelta.current = new Delta([{ retain: 5 }, { insert: "!" }]);

  // Before making a local edit, the editor should have initial contents
  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello\n" }],
  });

  editor.updateContents(localDelta.current);

  // The editor should contain the local edit
  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello!\n" }],
  });

  // Construct snapshot handler callback function to test
  let callback = onDeltaSnapshot(
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort
  );

  // Create a fake snapshot with two new committed insert deltas
  let snapshot1 = makeDeltaSnapshot([
    {
      ID: "a",
      timestamp: makeTimestamp(3, 0),
      ops: [
        {
          retain: 5,
        },
        {
          insert: " world",
        },
      ],
    },
  ]);

  callback(snapshot1);

  // After receiving snapshot, the editor should contain inserted text
  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello world!\n" }],
  });
});

it("can correctly resolve parallel edits", async () => {
  let cxt1 = makeContext();
  let cxt2 = makeContext();

  // Set initial revision
  cxt1.revisionCache.current = {
    delta: initialDelta(),
    timestamp: makeTimestamp(1, 0),
  };

  // Initialize editor with initial revision
  cxt1.editor.setContents(cxt1.revisionCache.current.delta);

  // Set initial revision
  cxt2.revisionCache.current = {
    delta: initialDelta(),
    timestamp: makeTimestamp(1, 0),
  };

  // Initialize editor with initial revision
  cxt2.editor.setContents(cxt2.revisionCache.current.delta);

  // Construct snapshot handler callback function to test
  let callback1 = onDeltaSnapshot(
    cxt1.uncommittedDeltas,
    cxt1.revisionCache,
    cxt1.editor,
    cxt1.localDelta,
    cxt1.readyPort
  );

  // Construct snapshot handler callback function to test
  let callback2 = onDeltaSnapshot(
    cxt2.uncommittedDeltas,
    cxt2.revisionCache,
    cxt2.editor,
    cxt2.localDelta,
    cxt2.readyPort
  );
});

it("can correctly handle in-flight deletes", async () => {
  let {
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort,
  } = makeContext();

  revisionCache.current = {
    delta: new Delta([{ insert: "hello world\n" }]),
    timestamp: makeTimestamp(1, 0),
  };

  editor.setContents(revisionCache.current.delta);

  localDelta.current = new Delta([{ retain: 5 }, { delete: 6 }]);

  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello world\n" }],
  });

  editor.updateContents(localDelta.current);

  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello\n" }],
  });

  let callback = onDeltaSnapshot(
    uncommittedDeltas,
    revisionCache,
    editor,
    localDelta,
    readyPort
  );

  let snapshot1 = makeDeltaSnapshot([]);

  callback(snapshot1);

  expect(editor.getContents()).toEqual({
    ops: [{ insert: "hello\n" }],
  });
});
