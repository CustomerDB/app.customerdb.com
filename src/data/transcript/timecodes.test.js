import Delta from "quill-delta";
import IntervalTree from "@flatten-js/interval-tree";
import { timeToIndex } from "./timecodes.js";

describe("timeToIndex function", () => {
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

  const timeTree = new IntervalTree();

  spans.forEach(([s, e, i, j]) => {
    timeTree.insert([s, e], [i, j]);
  });

  test("it should return the index of a time offset", () => {
    let result;

    result = timeToIndex(0.0, timeTree, initialRevision, initialRevision);
    expect(result).toBe(0);

    result = timeToIndex(0.5, timeTree, initialRevision, initialRevision);
    expect(result).toBe(0);

    result = timeToIndex(1.0, timeTree, initialRevision, initialRevision);
    expect(result).toBe(0);

    result = timeToIndex(1.5, timeTree, initialRevision, initialRevision);
    expect(result).toBe(5);

    result = timeToIndex(2.0, timeTree, initialRevision, initialRevision);
    expect(result).toBe(5);

    result = timeToIndex(2.1, timeTree, initialRevision, initialRevision);
    expect(result).toBe(8);

    result = timeToIndex(2.7, timeTree, initialRevision, initialRevision);
    expect(result).toBe(10);

    result = timeToIndex(2.3, timeTree, initialRevision, initialRevision);
    expect(result).toBeUndefined();
  });

  test("it should be robust to subsequent edits", () => {});
});
