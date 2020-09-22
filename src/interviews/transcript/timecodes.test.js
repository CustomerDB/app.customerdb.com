import { indexToTime, timeToIndex } from "./timecodes.js";

import Delta from "quill-delta";
import IntervalTree from "@flatten-js/interval-tree";

const initialRevision = new Delta([
  {
    insert: "This is a transcript.\n",
  },
]);

const spans = [
  [0.0, 1.0, 0, 3],
  [1.0, 2.0, 5, 6],
  [2.1, 2.1, 8, 8],
  [2.5, 3.0, 10, 19],
];

describe("timeToIndex function", () => {
  const timeTree = new IntervalTree();

  spans.forEach(([s, e, i, j]) => {
    timeTree.insert([s, e], [i, j]);
  });

  test("it should return the index of a time offset", () => {
    let result;

    result = timeToIndex(0.0, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(0.5, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(1.0, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(1.5, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([5, 6]);

    result = timeToIndex(2.0, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([5, 6]);

    result = timeToIndex(2.1, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([8, 8]);

    result = timeToIndex(2.7, timeTree, initialRevision, initialRevision);
    expect(result).toStrictEqual([10, 19]);

    result = timeToIndex(2.3, timeTree, initialRevision, initialRevision);
    expect(result).toBeUndefined();
  });

  test("it should be robust to subsequent edits", () => {
    const currentRevision = new Delta([
      {
        insert: "This is a long transcript.\n",
      },
    ]);

    let result;

    result = timeToIndex(0.0, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(0.5, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(1.0, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([0, 3]);

    result = timeToIndex(1.5, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([5, 6]);

    result = timeToIndex(2.0, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([5, 6]);

    result = timeToIndex(2.1, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([8, 8]);

    result = timeToIndex(2.7, timeTree, initialRevision, currentRevision);
    expect(result).toStrictEqual([15, 24]);

    result = timeToIndex(2.3, timeTree, initialRevision, currentRevision);
    expect(result).toBeUndefined();
  });
});

describe("indexToTime function", () => {
  const indexTree = new IntervalTree();

  spans.forEach(([s, e, i, j]) => {
    indexTree.insert([i, j], [s, e]);
  });

  test("it should return the time offset for an index", () => {
    let result;

    result = indexToTime(0, indexTree, initialRevision, initialRevision);
    expect(result).toBe(0.0);

    result = indexToTime(3, indexTree, initialRevision, initialRevision);
    expect(result).toBe(0.0);

    result = indexToTime(5, indexTree, initialRevision, initialRevision);
    expect(result).toBe(1.0);

    result = indexToTime(6, indexTree, initialRevision, initialRevision);
    expect(result).toBe(1.0);

    result = indexToTime(8, indexTree, initialRevision, initialRevision);
    expect(result).toBe(2.1);

    result = indexToTime(10, indexTree, initialRevision, initialRevision);
    expect(result).toBe(2.5);

    result = indexToTime(15, indexTree, initialRevision, initialRevision);
    expect(result).toBe(2.5);

    result = indexToTime(4, indexTree, initialRevision, initialRevision);
    expect(result).toBeUndefined();
  });

  test("it should be robust to subsequent edits", () => {
    const currentRevision = new Delta([
      {
        insert: "This is a long transcript.\n",
      },
    ]);

    let result;

    result = indexToTime(0, indexTree, initialRevision, currentRevision);
    expect(result).toBe(0.0);

    result = indexToTime(3, indexTree, initialRevision, currentRevision);
    expect(result).toBe(0.0);

    result = indexToTime(5, indexTree, initialRevision, currentRevision);
    expect(result).toBe(1.0);

    result = indexToTime(6, indexTree, initialRevision, currentRevision);
    expect(result).toBe(1.0);

    result = indexToTime(8, indexTree, initialRevision, currentRevision);
    expect(result).toBe(2.1);

    result = indexToTime(15, indexTree, initialRevision, currentRevision);
    expect(result).toBe(2.5);

    result = indexToTime(19, indexTree, initialRevision, currentRevision);
    expect(result).toBe(2.5);
  });
});
